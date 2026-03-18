using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class QueuePanel : UserControl
{
    private DataGridView grid = null!;
    private Label lblPending = null!, lblProcessing = null!, lblReleased = null!;
    private ComboBox cmbFilter = null!;
    private System.Windows.Forms.Timer refreshTimer = null!;
    private List<QueueRequest> _all = [];

    public QueuePanel()
    {
        BackColor = Color.FromArgb(241, 245, 249);
        BuildUI();
        _ = LoadAsync();
        refreshTimer = new System.Windows.Forms.Timer { Interval = 15000 };
        refreshTimer.Tick += async (_, _) => await LoadAsync();
        refreshTimer.Start();
    }

    private void BuildUI()
    {
        // ── Toolbar ──────────────────────────────────────────────────
        var toolbar = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.White, Padding = new Padding(10, 8, 10, 8) };
        toolbar.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, toolbar.Height - 1, toolbar.Width, toolbar.Height - 1);

        var lblTitle = new Label { Text = "🎫  Queue Management", Font = new Font("Segoe UI", 12, FontStyle.Bold), ForeColor = Color.FromArgb(15, 48, 96), AutoSize = true, Location = new Point(10, 12) };

        cmbFilter = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = 140, Location = new Point(220, 14), Font = new Font("Segoe UI", 9) };
        cmbFilter.Items.AddRange(["All", "Pending", "Processing", "Released", "Cancelled"]);
        cmbFilter.SelectedIndex = 0;
        cmbFilter.SelectedIndexChanged += (_, _) => ApplyFilter();

        var btnRefresh = MakeButton("↻ Refresh", Color.FromArgb(59, 130, 246));
        btnRefresh.Location = new Point(370, 12);
        btnRefresh.Click += async (_, _) => await LoadAsync();

        var btnCheckIn = MakeButton("✚ Walk-in", Color.FromArgb(16, 185, 129));
        btnCheckIn.Location = new Point(470, 12);
        btnCheckIn.Click += (_, _) => OpenAddDialog();

        toolbar.Controls.AddRange([lblTitle, cmbFilter, btnRefresh, btnCheckIn]);

        // ── Stats strip ──────────────────────────────────────────────
        var statsPanel = new Panel { Dock = DockStyle.Top, Height = 60, BackColor = Color.FromArgb(248, 250, 252), Padding = new Padding(10, 8, 10, 8) };
        statsPanel.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, statsPanel.Height - 1, statsPanel.Width, statsPanel.Height - 1);

        lblPending    = MakeStat("Pending",    "0", Color.FromArgb(245, 158, 11));
        lblProcessing = MakeStat("Processing", "0", Color.FromArgb(59, 130, 246));
        lblReleased   = MakeStat("Released",   "0", Color.FromArgb(16, 185, 129));

        lblPending.Location    = new Point(10, 8);
        lblProcessing.Location = new Point(160, 8);
        lblReleased.Location   = new Point(310, 8);
        statsPanel.Controls.AddRange([lblPending, lblProcessing, lblReleased]);

        // ── Grid ─────────────────────────────────────────────────────
        grid = new DataGridView
        {
            Dock = DockStyle.Fill,
            ReadOnly = true,
            AllowUserToAddRows = false,
            AllowUserToDeleteRows = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            MultiSelect = false,
            BackgroundColor = Color.White,
            BorderStyle = BorderStyle.None,
            RowHeadersVisible = false,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            Font = new Font("Segoe UI", 9),
            GridColor = Color.FromArgb(226, 232, 240),
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
        };
        grid.DefaultCellStyle.SelectionBackColor = Color.FromArgb(219, 234, 254);
        grid.DefaultCellStyle.SelectionForeColor = Color.FromArgb(30, 58, 138);
        grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(241, 245, 249);
        grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        grid.ColumnHeadersHeight = 36;
        grid.EnableHeadersVisualStyles = false;

        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colQ",    HeaderText = "Queue #",    FillWeight = 60 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colName", HeaderText = "Name",       FillWeight = 160 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colDoc",  HeaderText = "Document",   FillWeight = 130 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colType", HeaderText = "Type",       FillWeight = 70 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colStat", HeaderText = "Status",     FillWeight = 80 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colTime", HeaderText = "Requested",  FillWeight = 100 });

        // Action buttons column
        var colAct = new DataGridViewButtonColumn { Name = "colAct", HeaderText = "Action", FillWeight = 90, UseColumnTextForButtonValue = false };
        grid.Columns.Add(colAct);

        grid.CellFormatting += Grid_CellFormatting;
        grid.CellClick += Grid_CellClick;

        // ── Action panel ─────────────────────────────────────────────
        var actionPanel = new Panel { Dock = DockStyle.Bottom, Height = 44, BackColor = Color.White, Padding = new Padding(10, 6, 10, 6) };
        actionPanel.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, 0, actionPanel.Width, 0);

        var btnProcess = MakeButton("▶ Process Selected", Color.FromArgb(59, 130, 246));
        btnProcess.Location = new Point(10, 6);
        btnProcess.Click += async (_, _) => await UpdateStatusAsync("Processing");

        var btnRelease = MakeButton("✔ Release Selected", Color.FromArgb(16, 185, 129));
        btnRelease.Location = new Point(180, 6);
        btnRelease.Click += async (_, _) => await UpdateStatusAsync("Released");

        var btnCancel = MakeButton("✕ Cancel Selected", Color.FromArgb(239, 68, 68));
        btnCancel.Location = new Point(350, 6);
        btnCancel.Click += async (_, _) => await UpdateStatusAsync("Cancelled");

        actionPanel.Controls.AddRange([btnProcess, btnRelease, btnCancel]);

        Controls.Add(grid);
        Controls.Add(actionPanel);
        Controls.Add(statsPanel);
        Controls.Add(toolbar);
    }

    private async Task LoadAsync()
    {
        try
        {
            _all = await ApiClient.GetAsync<List<QueueRequest>>("/api/queue/today") ?? [];
            ApplyFilter();
            UpdateStats();
        }
        catch { /* silently ignore if API is down */ }
    }

    private void ApplyFilter()
    {
        var filter = cmbFilter.SelectedItem?.ToString() ?? "All";
        var list = filter == "All" ? _all : _all.Where(q => q.Status == filter).ToList();
        PopulateGrid(list);
    }

    private void PopulateGrid(List<QueueRequest> list)
    {
        if (grid.InvokeRequired) { grid.Invoke(() => PopulateGrid(list)); return; }
        grid.Rows.Clear();
        foreach (var q in list.OrderBy(x => x.RequestedAt))
        {
            var action = q.Status switch
            {
                "Pending"    => "▶ Process",
                "Processing" => "✔ Release",
                _            => "—"
            };
            var i = grid.Rows.Add(
                q.QueueNumber,
                q.RequesterName,
                q.DocumentType,
                q.RequestType,
                q.Status,
                q.RequestedAt.ToLocalTime().ToString("hh:mm tt")
            );
            grid.Rows[i].Cells["colAct"].Value = action;
            grid.Rows[i].Tag = q;
        }
    }

    private void UpdateStats()
    {
        if (lblPending.InvokeRequired) { lblPending.Invoke(UpdateStats); return; }
        lblPending.Text    = $"⏳ Pending\n{_all.Count(q => q.Status == "Pending")}";
        lblProcessing.Text = $"⚙ Processing\n{_all.Count(q => q.Status == "Processing")}";
        lblReleased.Text   = $"✔ Released\n{_all.Count(q => q.Status == "Released")}";
    }

    private async void Grid_CellClick(object? sender, DataGridViewCellEventArgs e)
    {
        if (e.RowIndex < 0 || e.ColumnIndex != grid.Columns["colAct"].Index) return;
        var q = grid.Rows[e.RowIndex].Tag as QueueRequest;
        if (q == null) return;

        var newStatus = q.Status switch
        {
            "Pending"    => "Processing",
            "Processing" => "Released",
            _            => (string?)null
        };
        if (newStatus == null) return;
        await PatchStatusAsync(q.Id, newStatus);
    }

    private async Task UpdateStatusAsync(string newStatus)
    {
        if (grid.SelectedRows.Count == 0) return;
        var q = grid.SelectedRows[0].Tag as QueueRequest;
        if (q == null) return;
        await PatchStatusAsync(q.Id, newStatus);
    }

    private async Task PatchStatusAsync(int id, string status)
    {
        try
        {
            await ApiClient.PatchAsync($"/api/queue/{id}/status", status);
            await LoadAsync();
        }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Error"); }
    }

    private void OpenAddDialog()
    {
        using var dlg = new QueueAddDialog();
        if (dlg.ShowDialog() == DialogResult.OK)
            _ = LoadAsync();
    }

    private void Grid_CellFormatting(object? sender, DataGridViewCellFormattingEventArgs e)
    {
        if (e.RowIndex < 0) return;
        var q = grid.Rows[e.RowIndex].Tag as QueueRequest;
        if (q == null) return;

        if (grid.Columns[e.ColumnIndex].Name == "colStat")
        {
            e.CellStyle.ForeColor = q.Status switch
            {
                "Pending"    => Color.FromArgb(180, 83, 9),
                "Processing" => Color.FromArgb(29, 78, 216),
                "Released"   => Color.FromArgb(6, 95, 70),
                "Cancelled"  => Color.FromArgb(127, 29, 29),
                _            => Color.Black
            };
            e.CellStyle.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        }
    }

    private static Button MakeButton(string text, Color bg)
    {
        var b = new Button
        {
            Text = text, Size = new Size(155, 30),
            FlatStyle = FlatStyle.Flat, BackColor = bg,
            ForeColor = Color.White, Font = new Font("Segoe UI", 9),
            Cursor = Cursors.Hand
        };
        b.FlatAppearance.BorderSize = 0;
        return b;
    }

    private static Label MakeStat(string label, string value, Color color)
    {
        return new Label
        {
            Text = $"{label}\n{value}",
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = color,
            AutoSize = false,
            Size = new Size(140, 44),
            TextAlign = ContentAlignment.MiddleLeft
        };
    }
}
