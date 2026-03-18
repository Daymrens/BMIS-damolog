using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BarangayDesktop;

public class AnalyticsPanel : Panel
{
    // Stat labels
    private Label lblTotalRes = null!, lblTotalDocs = null!, lblTotalRev = null!, lblPeakHour = null!;

    // Chart panels
    private Panel pnlMonthlyRes = null!, pnlDocTypes = null!, pnlHours = null!, pnlSitio = null!;

    // Raw data
    private List<Resident>  _residents  = [];
    private List<Document>  _documents  = [];
    private List<Payment>   _payments   = [];
    private List<QueueRequest> _queues  = [];

    private int _year = DateTime.Now.Year;

    public AnalyticsPanel()
    {
        BackColor = Color.FromArgb(241, 245, 249);
        BuildUI();
        _ = LoadAsync();
    }

    private void BuildUI()
    {
        // ── Header strip ──────────────────────────────────────────────
        var header = new Panel
        {
            Dock = DockStyle.Top, Height = 52,
            BackColor = Color.FromArgb(15, 48, 96)
        };
        header.Controls.Add(new Label
        {
            Text = "📈  Analytics & Insights",
            Font = new Font("Segoe UI", 13, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(14, 14)
        });

        var cmbYear = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Font = new Font("Segoe UI", 9), Width = 90,
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        for (int y = DateTime.Now.Year; y >= 2022; y--) cmbYear.Items.Add(y);
        cmbYear.SelectedIndex = 0;
        cmbYear.SelectedIndexChanged += (_, _) =>
        {
            _year = (int)cmbYear.SelectedItem!;
            RedrawAll();
        };

        var btnRefresh = new Button
        {
            Text = "↻ Refresh", Size = new Size(88, 28), FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 78, 216), ForeColor = Color.White,
            Font = new Font("Segoe UI", 8.5f), Cursor = Cursors.Hand,
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        btnRefresh.FlatAppearance.BorderSize = 0;
        btnRefresh.Click += (_, _) => _ = LoadAsync();

        header.Controls.AddRange([cmbYear, btnRefresh]);
        header.Resize += (_, _) =>
        {
            btnRefresh.Location = new Point(header.Width - 100, 12);
            cmbYear.Location    = new Point(header.Width - 200, 14);
        };

        // ── KPI strip ─────────────────────────────────────────────────
        var kpiStrip = new TableLayoutPanel
        {
            Dock = DockStyle.Top, Height = 72, ColumnCount = 4,
            BackColor = Color.White, Padding = new Padding(8, 8, 8, 8)
        };
        kpiStrip.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(226, 232, 240));
            e.Graphics.DrawLine(pen, 0, kpiStrip.Height - 1, kpiStrip.Width, kpiStrip.Height - 1);
        };
        for (int i = 0; i < 4; i++) kpiStrip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));

        lblTotalRes  = KpiCard(kpiStrip, "👥 Total Residents",  "0",    Color.FromArgb(37, 99, 235),  0);
        lblTotalDocs = KpiCard(kpiStrip, "📄 Total Documents",  "0",    Color.FromArgb(22, 163, 74),  1);
        lblTotalRev  = KpiCard(kpiStrip, "💰 Total Revenue",    "₱0",   Color.FromArgb(217, 119, 6),  2);
        lblPeakHour  = KpiCard(kpiStrip, "⏰ Peak Service Hour","—",    Color.FromArgb(139, 92, 246), 3);

        // ── Scroll area ───────────────────────────────────────────────
        var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = Color.FromArgb(241, 245, 249) };

        var body = new TableLayoutPanel
        {
            AutoSize = true, ColumnCount = 2,
            Padding = new Padding(12, 12, 12, 12),
            BackColor = Color.FromArgb(241, 245, 249)
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));

        // Row 0: Monthly registrations (full width)
        var rowFull = new TableLayoutPanel { ColumnCount = 1, AutoSize = true, Dock = DockStyle.Fill, Margin = new Padding(0, 0, 0, 10) };
        rowFull.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        pnlMonthlyRes = ChartCard(rowFull, "📅  Monthly Resident Registrations", 0, 0, 180);
        body.Controls.Add(rowFull);
        body.SetColumnSpan(rowFull, 2);

        // Row 1: Doc types + Sitio breakdown
        pnlDocTypes = ChartCard(body, "📄  Most Requested Documents", 0, 1, 200);
        pnlSitio    = ChartCard(body, "🏘  Population by Sitio",      1, 1, 200);

        // Row 2: Peak hours (full width)
        var rowFull2 = new TableLayoutPanel { ColumnCount = 1, AutoSize = true, Dock = DockStyle.Fill, Margin = new Padding(0, 0, 0, 10) };
        rowFull2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        pnlHours = ChartCard(rowFull2, "⏰  Transactions by Hour of Day", 0, 0, 180);
        body.Controls.Add(rowFull2);
        body.SetColumnSpan(rowFull2, 2);

        scroll.Controls.Add(body);
        scroll.Resize += (_, _) => body.Width = scroll.ClientSize.Width;

        Controls.Add(scroll);
        Controls.Add(kpiStrip);
        Controls.Add(header);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private static Label KpiCard(TableLayoutPanel parent, string title, string value, Color color, int col)
    {
        var card = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Margin = new Padding(4, 0, 4, 0) };
        card.Paint += (_, e) =>
        {
            using var pen = new Pen(color, 3);
            e.Graphics.DrawLine(pen, 0, 0, card.Width, 0);
        };
        card.Controls.Add(new Label
        {
            Text = title, AutoSize = true, Location = new Point(10, 8),
            Font = new Font("Segoe UI", 7.5f), ForeColor = Color.FromArgb(100, 116, 139)
        });
        var lbl = new Label
        {
            Text = value, AutoSize = true, Location = new Point(8, 26),
            Font = new Font("Segoe UI", 16, FontStyle.Bold), ForeColor = color
        };
        card.Controls.Add(lbl);
        parent.Controls.Add(card, col, 0);
        return lbl;
    }

    private static Panel ChartCard(TableLayoutPanel parent, string title, int col, int row, int height)
    {
        var card = new Panel
        {
            Dock = DockStyle.Fill, BackColor = Color.White,
            Margin = new Padding(4, 0, 4, 10), Height = height + 44
        };
        card.Paint += (_