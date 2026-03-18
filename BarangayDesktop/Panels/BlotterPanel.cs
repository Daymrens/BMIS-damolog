using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class BlotterPanel : Panel
{
    private DataGridView grid = null!;
    private List<Blotter> blotters = [];
    private TextBox txtSearch = null!;
    private ComboBox cmbStatus = null!;
    private Label lblCount = null!, lblTotal = null!, lblPending = null!, lblSettled = null!, lblEscalated = null!;

    public BlotterPanel()
    {
        BackColor = Color.FromArgb(241, 245, 249);
        BuildUI();
        _ = LoadAsync();
    }

    private void BuildUI()
    {
        // ── Stat strip ────────────────────────────────────────────────
        var strip = new TableLayoutPanel
        {
            Dock = DockStyle.Top, Height = 56, ColumnCount = 4,
            BackColor = Color.FromArgb(15, 48, 96), Padding = new Padding(12, 0, 12, 0)
        };
        for (int i = 0; i < 4; i++) strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        lblTotal     = StripStat(strip, "📋 Total Cases",   "0", 0);
        lblPending   = StripStat(strip, "⏳ Pending",        "0", 1);
        lblSettled   = StripStat(strip, "✅ Settled",        "0", 2);
        lblEscalated = StripStat(strip, "⚠ Escalated",      "0", 3);

        // ── Toolbar ───────────────────────────────────────────────────
        var toolbar = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.White };
        toolbar.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(229, 231, 235));
            e.Graphics.DrawLine(pen, 0, toolbar.Height - 1, toolbar.Width, toolbar.Height - 1);
        };

        var btnFile    = ToolBtn("+ File Blotter",  Color.FromArgb(185, 28, 28),  120);
        var btnEdit    = ToolBtn("✏ Update",        Color.FromArgb(37, 99, 235),  90);
        var btnRefresh = ToolBtn("↻",               Color.FromArgb(100, 116, 139), 36);

        btnFile.Click    += (_, _) => OpenForm(null);
        btnEdit.Click    += (_, _) => { if (Selected() is { } b) OpenForm(b); };
        btnRefresh.Click += (_, _) => _ = LoadAsync();

        txtSearch = new TextBox
        {
            PlaceholderText = "🔍  Search case, complainant, respondent…",
            Width = 260, Height = 30, Font = new Font("Segoe UI", 9), BorderStyle = BorderStyle.FixedSingle
        };
        txtSearch.TextChanged += (_, _) => FilterGrid();

        cmbStatus = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList, Width = 130,
            Font = new Font("Segoe UI", 9)
        };
        cmbStatus.Items.AddRange(["All Status", "Pending", "Settled", "Escalated"]);
        cmbStatus.SelectedIndex = 0;
        cmbStatus.SelectedIndexChanged += (_, _) => FilterGrid();

        lblCount = new Label { AutoSize = true, Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(107, 114, 128) };

        toolbar.Controls.AddRange([btnFile, btnEdit, txtSearch, cmbStatus, lblCount, btnRefresh]);
        toolbar.Resize += (_, _) =>
        {
            int x = 10, y = 11;
            btnFile.Location  = new Point(x, y); x += btnFile.Width + 6;
            btnEdit.Location  = new Point(x, y); x += btnEdit.Width + 16;
            txtSearch.Location = new Point(x, y); x += txtSearch.Width + 8;
            cmbStatus.Location = new Point(x, y + 1); x += cmbStatus.Width + 12;
            lblCount.Location  = new Point(x, y + 6);
            btnRefresh.Location = new Point(toolbar.Width - 46, y);
        };

        // ── Grid ──────────────────────────────────────────────────────
        grid = new DataGridView
        {
            Dock = DockStyle.Fill, ReadOnly = true,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.None,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            AllowUserToAddRows = false, BackgroundColor = Color.White,
            BorderStyle = BorderStyle.None, RowHeadersVisible = false,
            Font = new Font("Segoe UI", 9f), ColumnHeadersHeight = 34,
            RowTemplate = { Height = 32 }, GridColor = Color.FromArgb(243, 244, 246),
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal
        };
        grid.ColumnHeadersDefaultCellStyle.BackColor   = Color.FromArgb(248, 250, 252);
        grid.ColumnHeadersDefaultCellStyle.ForeColor   = Color.FromArgb(71, 85, 105);
        grid.ColumnHeadersDefaultCellStyle.Font        = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        grid.ColumnHeadersDefaultCellStyle.Padding     = new Padding(10, 0, 0, 0);
        grid.DefaultCellStyle.Padding                  = new Padding(10, 0, 0, 0);
        grid.DefaultCellStyle.SelectionBackColor       = Color.FromArgb(219, 234, 254);
        grid.DefaultCellStyle.SelectionForeColor       = Color.FromArgb(30, 58, 138);
        grid.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(249, 250, 251);
        grid.EnableHeadersVisualStyles = false;

        grid.Columns.AddRange(
            new DataGridViewTextBoxColumn { Name = "Id",           Visible = false },
            new DataGridViewTextBoxColumn { Name = "CaseNumber",   HeaderText = "Case No.",      Width = 140 },
            new DataGridViewTextBoxColumn { Name = "Complainant",  HeaderText = "Complainant",   Width = 160 },
            new DataGridViewTextBoxColumn { Name = "Respondent",   HeaderText = "Respondent",    Width = 160 },
            new DataGridViewTextBoxColumn { Name = "Incident",     HeaderText = "Incident",      AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill },
            new DataGridViewTextBoxColumn { Name = "Location",     HeaderText = "Location",      Width = 130 },
            new DataGridViewTextBoxColumn { Name = "IncidentDate", HeaderText = "Incident Date", Width = 110 },
            new DataGridViewTextBoxColumn { Name = "FiledDate",    HeaderText = "Filed Date",    Width = 110 },
            new DataGridViewTextBoxColumn { Name = "Status",       HeaderText = "Status",        Width = 100 }
        );

        grid.CellFormatting += (_, e) =>
        {
            if (e.ColumnIndex != grid.Columns["Status"]!.Index || e.RowIndex < 0) return;
            var val = e.Value?.ToString() ?? "";
            (e.CellStyle!.BackColor, e.CellStyle.ForeColor) = val switch
            {
                "Pending"   => (Color.FromArgb(254, 249, 195), Color.FromArgb(146, 64, 14)),
                "Settled"   => (Color.FromArgb(220, 252, 231), Color.FromArgb(22, 101, 52)),
                "Escalated" => (Color.FromArgb(254, 226, 226), Color.FromArgb(153, 27, 27)),
                _ => (Color.White, Color.Black)
            };
            e.CellStyle.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        };

        grid.CellMouseEnter += (_, e) => { if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.FromArgb(239, 246, 255); };
        grid.CellMouseLeave += (_, e) => { if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = e.RowIndex % 2 == 0 ? Color.White : Color.FromArgb(249, 250, 251); };

        Controls.Add(grid);
        Controls.Add(toolbar);
        Controls.Add(strip);
    }

    private static Label StripStat(TableLayoutPanel strip, string title, string value, int col)
    {
        var cell = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent, Margin = new Padding(4, 8, 4, 8) };
        cell.Controls.Add(new Label { Text = title, AutoSize = true, BackColor = Color.Transparent, Font = new Font("Segoe UI", 7.5f), ForeColor = Color.FromArgb(180, 210, 255), Location = new Point(0, 0) });
        var lbl = new Label { Text = value, AutoSize = true, BackColor = Color.Transparent, Font = new Font("Segoe UI", 15, FontStyle.Bold), ForeColor = Color.White, Location = new Point(0, 18) };
        cell.Controls.Add(lbl);
        strip.Controls.Add(cell, col, 0);
        return lbl;
    }

    private static Button ToolBtn(string text, Color bg, int width) => new()
    {
        Text = text, Width = width, Height = 30, BackColor = bg, ForeColor = Color.White,
        FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
        Cursor = Cursors.Hand, FlatAppearance = { BorderSize = 0 }
    };

    private async Task LoadAsync()
    {
        try
        {
            blotters = await ApiClient.GetListAsync<Blotter>("api/blotters");
            FilterGrid();
            UpdateStrip();
        }
        catch { }
    }

    private void UpdateStrip()
    {
        lblTotal.Text     = blotters.Count.ToString();
        lblPending.Text   = blotters.Count(b => b.Status == "Pending").ToString();
        lblSettled.Text   = blotters.Count(b => b.Status == "Settled").ToString();
        lblEscalated.Text = blotters.Count(b => b.Status == "Escalated").ToString();
    }

    private void FilterGrid()
    {
        var q = txtSearch.Text.ToLower();
        var statusFilter = cmbStatus.SelectedIndex > 0 ? cmbStatus.SelectedItem?.ToString() : null;

        var filtered = blotters.Where(b =>
            (statusFilter is null || b.Status == statusFilter) &&
            (string.IsNullOrWhiteSpace(q) ||
             b.CaseNumber.ToLower().Contains(q) ||
             b.Complainant.ToLower().Contains(q) ||
             b.Respondent.ToLower().Contains(q) ||
             b.Incident.ToLower().Contains(q))
        ).ToList();

        grid.Rows.Clear();
        foreach (var b in filtered)
            grid.Rows.Add(b.Id, b.CaseNumber, b.Complainant, b.Respondent, b.Incident,
                b.Location, b.IncidentDate.ToString("MM/dd/yyyy"),
                b.FiledDate.ToString("MM/dd/yyyy"), b.Status);

        lblCount.Text = $"{filtered.Count} case(s)";
    }

    private Blotter? Selected()
    {
        if (grid.SelectedRows.Count == 0) return null;
        var id = (int)grid.SelectedRows[0].Cells["Id"].Value;
        return blotters.FirstOrDefault(b => b.Id == id);
    }

    private void OpenForm(Blotter? blotter)
    {
        var form = new BlotterForm(blotter);
        if (form.ShowDialog() == DialogResult.OK) _ = LoadAsync();
    }
}
