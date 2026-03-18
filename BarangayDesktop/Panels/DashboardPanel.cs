using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BarangayDesktop;

public class DashboardPanel : Panel
{
    private Label lblResidents = null!, lblOfficials = null!, lblDocs = null!, lblBlotters = null!;
    private Label lblMale = null!, lblFemale = null!, lblVoters = null!, lblSenior = null!;
    private Label lblQueue = null!, lblQueuePending = null!, lblCollections = null!, lblMonthly = null!;
    private DataGridView gridResidents = null!, gridBlotters = null!;
    private Panel chartDocsPanel = null!, chartBlotterPanel = null!;
    private Stats? _stats;

    public DashboardPanel()
    {
        BackColor = Color.FromArgb(241, 245, 249);
        AutoScroll = true;
        BuildUI();
        _ = LoadAsync();
    }

    private void BuildUI()
    {
        // Outer fill panel handles scrolling
        var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = Color.FromArgb(241, 245, 249) };

        // Root layout sits inside the scroll panel
        var root = new TableLayoutPanel
        {
            AutoSize = true,
            ColumnCount = 1,
            Padding = new Padding(16, 12, 16, 16),
            BackColor = Color.FromArgb(241, 245, 249)
        };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        // ── Header ───────────────────────────────────────────────────
        var header = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 2, Height = 56,
            BackColor = Color.Transparent, Margin = new Padding(0, 0, 0, 10)
        };
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

        var titlePanel = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent };
        var logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "logo.png");
        int tx = 0;
        if (File.Exists(logoPath))
        {
            titlePanel.Controls.Add(new PictureBox
            {
                Image = Image.FromFile(logoPath), SizeMode = PictureBoxSizeMode.Zoom,
                Size = new Size(44, 44), Location = new Point(0, 6), BackColor = Color.Transparent
            });
            tx = 52;
        }
        titlePanel.Controls.Add(new Label
        {
            Text = "Barangay Damolog — Dashboard",
            Font = new Font("Segoe UI", 15, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            AutoSize = true, Location = new Point(tx, 4), BackColor = Color.Transparent
        });
        titlePanel.Controls.Add(new Label
        {
            Text = DateTime.Now.ToString("dddd, MMMM dd, yyyy"),
            Font = new Font("Segoe UI", 9), ForeColor = Color.FromArgb(100, 116, 139),
            AutoSize = true, Location = new Point(tx, 32), BackColor = Color.Transparent
        });

        var btnRefresh = new Button
        {
            Text = "⟳  Refresh", Size = new Size(100, 34), FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(15, 48, 96), ForeColor = Color.White,
            Font = new Font("Segoe UI", 9, FontStyle.Bold), Cursor = Cursors.Hand,
            Anchor = AnchorStyles.Right | AnchorStyles.Top, Margin = new Padding(0, 10, 0, 0)
        };
        btnRefresh.FlatAppearance.BorderSize = 0;
        btnRefresh.Click += (_, _) => _ = LoadAsync();

        header.Controls.Add(titlePanel, 0, 0);
        header.Controls.Add(btnRefresh, 1, 0);
        root.Controls.Add(header);

        // ── Live strip ───────────────────────────────────────────────
        var strip = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 4, Height = 62,
            Margin = new Padding(0, 0, 0, 10), Padding = new Padding(16, 0, 16, 0)
        };
        for (int i = 0; i < 4; i++) strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        strip.Paint += (_, e) =>
        {
            using var br = new LinearGradientBrush(strip.ClientRectangle,
                Color.FromArgb(15, 48, 96), Color.FromArgb(29, 78, 216), LinearGradientMode.Horizontal);
            e.Graphics.FillRectangle(br, strip.ClientRectangle);
        };

        lblQueue        = AddLiveCell(strip, "🎫 Today's Queue",       "—", 0);
        lblQueuePending = AddLiveCell(strip, "⏳ Pending",              "—", 1);
        lblCollections  = AddLiveCell(strip, "💰 Today's Collections", "—", 2);
        lblMonthly      = AddLiveCell(strip, "📅 Monthly Revenue",     "—", 3);
        root.Controls.Add(strip);

        // ── Row 1: 4 primary stat cards ──────────────────────────────
        var row1 = MakeTLP(4, 130, 10);
        lblResidents = AddBigCard(row1, "👥", "Total Residents",  "0", Color.FromArgb(37,99,235),  Color.FromArgb(29,78,216),  0);
        lblOfficials  = AddBigCard(row1, "🏛", "Active Officials", "0", Color.FromArgb(5,150,105),  Color.FromArgb(4,120,87),   1);
        lblDocs       = AddBigCard(row1, "📄", "Documents Issued", "0", Color.FromArgb(217,119,6),  Color.FromArgb(180,83,9),   2);
        lblBlotters   = AddBigCard(row1, "⚠",  "Pending Blotters","0", Color.FromArgb(220,38,38),  Color.FromArgb(185,28,28),  3);
        root.Controls.Add(row1);

        // ── Row 2: 4 secondary stat cards ────────────────────────────
        var row2 = MakeTLP(4, 96, 10);
        lblMale   = AddSmallCard(row2, "♂ Male Residents",    "0", Color.FromArgb(59,130,246),  0);
        lblFemale = AddSmallCard(row2, "♀ Female Residents",  "0", Color.FromArgb(236,72,153),  1);
        lblVoters = AddSmallCard(row2, "🗳 Registered Voters", "0", Color.FromArgb(139,92,246),  2);
        lblSenior = AddSmallCard(row2, "👴 Senior Citizens",   "0", Color.FromArgb(20,184,166),  3);
        root.Controls.Add(row2);

        // ── Row 3: Charts ─────────────────────────────────────────────
        var row3 = MakeTLP(2, 200, 10);
        chartDocsPanel    = AddChartCard(row3, "📊  Documents by Type", 0);
        chartBlotterPanel = AddChartCard(row3, "📊  Blotter by Status",  1);
        root.Controls.Add(row3);

        // ── Row 4: Recent tables ──────────────────────────────────────
        var row4 = MakeTLP(2, 220, 0);
        AddTableCard(row4, "🕐  Recently Added Residents", 0, out gridResidents);
        gridResidents.Columns.AddRange(
            new DataGridViewTextBoxColumn { HeaderText = "Name",  Width = 160 },
            new DataGridViewTextBoxColumn { HeaderText = "Sitio", Width = 110 },
            new DataGridViewTextBoxColumn { HeaderText = "Added", Width = 90  });

        AddTableCard(row4, "📋  Recent Blotter Cases", 1, out gridBlotters);
        gridBlotters.Columns.AddRange(
            new DataGridViewTextBoxColumn { HeaderText = "Case No.",    Width = 110 },
            new DataGridViewTextBoxColumn { HeaderText = "Complainant", Width = 120 },
            new DataGridViewTextBoxColumn { HeaderText = "Incident",    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill },
            new DataGridViewTextBoxColumn { HeaderText = "Status",      Width = 80  });
        root.Controls.Add(row4);

        scroll.Controls.Add(root);
        Controls.Add(scroll);

        // Keep root width in sync with scroll panel width
        scroll.Resize += (_, _) =>
        {
            root.Width = scroll.ClientSize.Width;
        };
    }

    // ── Layout helpers ────────────────────────────────────────────────

    private static TableLayoutPanel MakeTLP(int cols, int height, int bottomMargin)
    {
        var tlp = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = cols,
            Height = height, Margin = new Padding(0, 0, 0, bottomMargin),
            BackColor = Color.Transparent
        };
        for (int i = 0; i < cols; i++)
            tlp.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f / cols));
        return tlp;
    }

    private static Label AddLiveCell(TableLayoutPanel strip, string title, string value, int col)
    {
        var cell = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent, Margin = new Padding(4, 8, 4, 8) };
        cell.Controls.Add(new Label
        {
            Text = title, AutoSize = true, BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 7.5f), ForeColor = Color.FromArgb(180, 210, 255),
            Location = new Point(0, 0)
        });
        var lbl = new Label
        {
            Text = value, AutoSize = true, BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 16, FontStyle.Bold), ForeColor = Color.White,
            Location = new Point(0, 18)
        };
        cell.Controls.Add(lbl);
        strip.Controls.Add(cell, col, 0);
        return lbl;
    }

    private static Label AddBigCard(TableLayoutPanel row, string icon, string title, string value, Color c1, Color c2, int col)
    {
        var card = new Panel { Dock = DockStyle.Fill, Margin = new Padding(4) };
        ApplyRound(card, 12);
        card.Paint += (_, e) =>
        {
            using var br = new LinearGradientBrush(card.ClientRectangle, c1, c2, LinearGradientMode.ForwardDiagonal);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.FillRectangle(br, card.ClientRectangle);
        };

        // Watermark icon — top right
        var iconLbl = new Label
        {
            Text = icon, AutoSize = true, BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 24), ForeColor = Color.FromArgb(60, 255, 255, 255),
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        card.Controls.Add(iconLbl);
        card.Resize += (_, _) => iconLbl.Location = new Point(card.Width - iconLbl.Width - 10, 8);

        card.Controls.Add(new Label
        {
            Text = title, AutoSize = true, BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
            ForeColor = Color.FromArgb(210, 235, 255), Location = new Point(14, 12)
        });
        var lbl = new Label
        {
            Text = value, AutoSize = true, BackColor = Color.Transparent,
            Font = new Font("Segoe UI", 32, FontStyle.Bold), ForeColor = Color.White,
            Location = new Point(12, 38)
        };
        card.Controls.Add(lbl);
        row.Controls.Add(card, col, 0);
        return lbl;
    }

    private static Label AddSmallCard(TableLayoutPanel row, string title, string value, Color accent, int col)
    {
        var card = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Margin = new Padding(4) };
        ApplyRound(card, 10);

        var bar = new Panel { Size = new Size(5, 999), Location = new Point(0, 0), BackColor = accent };
        card.Controls.Add(bar);
        card.Resize += (_, _) => bar.Height = card.Height;

        card.Controls.Add(new Label
        {
            Text = title, AutoSize = true,
            Font = new Font("Segoe UI", 8, FontStyle.Bold), ForeColor = Color.FromArgb(100, 116, 139),
            Location = new Point(16, 14)
        });
        var lbl = new Label
        {
            Text = value, AutoSize = true,
            Font = new Font("Segoe UI", 24, FontStyle.Bold), ForeColor = accent,
            Location = new Point(14, 40)
        };
        card.Controls.Add(lbl);
        row.Controls.Add(card, col, 0);
        return lbl;
    }

    private Panel AddChartCard(TableLayoutPanel row, string title, int col)
    {
        var card = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Margin = new Padding(4) };
        ApplyRound(card, 10);
        card.Paint += (_, e) =>
        {
            using var br = new SolidBrush(Color.FromArgb(15, 48, 96));
            e.Graphics.FillRectangle(br, 0, 0, card.Width, 4);
        };
        card.Controls.Add(new Label
        {
            Text = title, AutoSize = true,
            Font = new Font("Segoe UI", 9, FontStyle.Bold), ForeColor = Color.FromArgb(30, 58, 95),
            Location = new Point(14, 12)
        });
        var chartArea = new Panel { BackColor = Color.White, Location = new Point(12, 38) };
        card.Controls.Add(chartArea);
        card.Resize += (_, _) => chartArea.Size = new Size(Math.Max(10, card.Width - 24), Math.Max(10, card.Height - 50));
        row.Controls.Add(card, col, 0);
        return chartArea;
    }

    private static void AddTableCard(TableLayoutPanel row, string title, int col, out DataGridView grid)
    {
        var card = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Margin = new Padding(4) };
        ApplyRound(card, 10);
        card.Paint += (_, e) =>
        {
            using var br = new SolidBrush(Color.FromArgb(15, 48, 96));
            e.Graphics.FillRectangle(br, 0, 0, card.Width, 4);
        };
        card.Controls.Add(new Label
        {
            Text = title, AutoSize = true,
            Font = new Font("Segoe UI", 9, FontStyle.Bold), ForeColor = Color.FromArgb(30, 58, 95),
            Location = new Point(14, 10)
        });
        var g = new DataGridView
        {
            Location = new Point(0, 36), ReadOnly = true,
            AllowUserToAddRows = false,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.None,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            BackgroundColor = Color.White, BorderStyle = BorderStyle.None,
            RowHeadersVisible = false, Font = new Font("Segoe UI", 8.5f),
            ColumnHeadersHeight = 28, RowTemplate = { Height = 26 },
            GridColor = Color.FromArgb(241, 245, 249)
        };
        g.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
        g.ColumnHeadersDefaultCellStyle.ForeColor = Color.FromArgb(100, 116, 139);
        g.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 8, FontStyle.Bold);
        g.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
        g.EnableHeadersVisualStyles = false;
        card.Controls.Add(g);
        card.Resize += (_, _) => g.Size = new Size(card.Width, Math.Max(10, card.Height - 36));
        row.Controls.Add(card, col, 0);
        grid = g;
    }

    private static void ApplyRound(Control p, int r)
    {
        // Draw rounded corners by painting over them with the parent background color
        // Do NOT set p.Region — that creates transparent holes that bleed through tabs
        p.Paint += (_, e) =>
        {
            var bg = p.Parent?.BackColor ?? Color.FromArgb(241, 245, 249);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            // Fill the four corner squares with parent bg to simulate rounded corners
            using var br = new SolidBrush(bg);
            e.Graphics.FillRectangle(br, 0, 0, r, r);
            e.Graphics.FillRectangle(br, p.Width - r, 0, r, r);
            e.Graphics.FillRectangle(br, 0, p.Height - r, r, r);
            e.Graphics.FillRectangle(br, p.Width - r, p.Height - r, r, r);
            // Draw the arc over each corner to restore the rounded look
            using var pen = new Pen(bg, 2);
            e.Graphics.DrawArc(pen, 0, 0, r * 2, r * 2, 180, 90);
            e.Graphics.DrawArc(pen, p.Width - r * 2, 0, r * 2, r * 2, 270, 90);
            e.Graphics.DrawArc(pen, p.Width - r * 2, p.Height - r * 2, r * 2, r * 2, 0, 90);
            e.Graphics.DrawArc(pen, 0, p.Height - r * 2, r * 2, r * 2, 90, 90);
        };
    }

    // ── Data ──────────────────────────────────────────────────────────

    private async Task LoadAsync()
    {
        try
        {
            _stats = await ApiClient.GetAsync<Stats>("api/stats");
            var pay = await ApiClient.GetAsync<PaymentSummary>("api/payments/summary");
            if (_stats is null) return;
            Invoke(() => UpdateUI(pay));
        }
        catch { }
    }

    private void UpdateUI(PaymentSummary? pay)
    {
        if (_stats is null) return;

        lblResidents.Text = _stats.TotalResidents.ToString("N0");
        lblOfficials.Text  = _stats.TotalOfficials.ToString("N0");
        lblDocs.Text       = _stats.TotalDocuments.ToString("N0");
        lblBlotters.Text   = _stats.PendingBlotters.ToString("N0");
        lblMale.Text       = _stats.MaleResidents.ToString("N0");
        lblFemale.Text     = _stats.FemaleResidents.ToString("N0");
        lblVoters.Text     = _stats.RegisteredVoters.ToString("N0");
        lblSenior.Text     = _stats.SeniorResidents.ToString("N0");
        lblQueue.Text        = _stats.TodayQueueTotal.ToString("N0");
        lblQueuePending.Text = _stats.TodayQueuePending.ToString("N0");
        lblCollections.Text  = pay is not null ? $"₱{pay.DailyTotal:N2}" : "₱0.00";
        lblMonthly.Text      = pay is not null ? $"₱{pay.MonthlyTotal:N2}" : "₱0.00";

        DrawBarChart(chartDocsPanel,
            _stats.DocsByType.Select(d => (d.Type.Replace("Certificate of ", "Cert. "), d.Count)).ToList(),
            [Color.FromArgb(37,99,235), Color.FromArgb(217,119,6), Color.FromArgb(5,150,105),
             Color.FromArgb(139,92,246), Color.FromArgb(236,72,153)]);

        DrawBarChart(chartBlotterPanel,
            _stats.BlottersByStatus.Select(b => (b.Status, b.Count)).ToList(),
            [Color.FromArgb(220,38,38), Color.FromArgb(5,150,105), Color.FromArgb(217,119,6)]);

        gridResidents.Rows.Clear();
        foreach (var r in _stats.RecentResidents)
            gridResidents.Rows.Add($"{r.LastName}, {r.FirstName}", r.Sitio, r.CreatedAt.ToString("MM/dd/yyyy"));

        gridBlotters.Rows.Clear();
        foreach (var b in _stats.RecentBlotters)
        {
            var i = gridBlotters.Rows.Add(b.CaseNumber, b.Complainant, b.Incident, b.Status);
            gridBlotters.Rows[i].Cells[3].Style.BackColor = b.Status switch
            {
                "Pending"   => Color.FromArgb(254, 243, 199),
                "Settled"   => Color.FromArgb(209, 250, 229),
                "Escalated" => Color.FromArgb(254, 226, 226),
                _ => Color.White
            };
            gridBlotters.Rows[i].Cells[3].Style.ForeColor = b.Status switch
            {
                "Pending"   => Color.FromArgb(146, 64, 14),
                "Settled"   => Color.FromArgb(6, 95, 70),
                "Escalated" => Color.FromArgb(153, 27, 27),
                _ => Color.Black
            };
        }
    }

    private static void DrawBarChart(Panel panel, List<(string Label, int Count)> data, Color[] colors)
    {
        panel.Tag = (data, colors);
        panel.Paint -= OnPaint;
        panel.Paint += OnPaint;
        panel.Invalidate();

        static void OnPaint(object? s, PaintEventArgs e)
        {
            if (s is not Panel p || p.Tag is not (List<(string Label, int Count)> items, Color[] cols)) return;
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.White);
            if (p.Width < 10 || p.Height < 10) return;
            if (items.Count == 0) { g.DrawString("No data", new Font("Segoe UI", 9), Brushes.LightGray, 10, 10); return; }

            int max = Math.Max(1, items.Max(i => i.Count));
            int spacing = 12;
            int barW = Math.Max(20, (p.Width - spacing) / items.Count - spacing);
            int chartH = p.Height - 44;

            for (int i = 0; i < items.Count; i++)
            {
                var (label, count) = items[i];
                var color = cols[i % cols.Length];
                int barH = Math.Max(4, (int)((double)count / max * chartH));
                int x = spacing + i * (barW + spacing);
                int y = chartH - barH;

                using var shadow = new SolidBrush(Color.FromArgb(15, 0, 0, 0));
                g.FillRectangle(shadow, x + 2, y + 2, barW, barH);

                using var path = new GraphicsPath();
                int r = 4;
                path.AddArc(x, y, r * 2, r * 2, 180, 90);
                path.AddArc(x + barW - r * 2, y, r * 2, r * 2, 270, 90);
                path.AddLine(x + barW, y + r, x + barW, y + barH);
                path.AddLine(x + barW, y + barH, x, y + barH);
                path.CloseFigure();
                using var br = new SolidBrush(color);
                g.FillPath(br, path);

                using var vf = new Font("Segoe UI", 7.5f, FontStyle.Bold);
                var vs = count.ToString();
                var vsz = g.MeasureString(vs, vf);
                g.DrawString(vs, vf, new SolidBrush(Color.FromArgb(50, 65, 85)), x + (barW - vsz.Width) / 2, y - 16);

                using var lf = new Font("Segoe UI", 6.5f);
                var lr = new RectangleF(x - 4, chartH + 6, barW + 8, 30);
                g.DrawString(label, lf, Brushes.Gray, lr, new StringFormat { Alignment = StringAlignment.Center });
            }
        }
    }
}
