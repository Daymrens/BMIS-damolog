using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class PaymentsPanel : UserControl
{
    private DataGridView grid = null!;
    private Label lblDaily = null!, lblMonthly = null!, lblYearly = null!, lblCount = null!;
    private DateTimePicker dtpDate = null!;
    private ComboBox cmbCategory = null!;
    private List<Payment> _all = [];

    public PaymentsPanel()
    {
        BackColor = Color.FromArgb(241, 245, 249);
        BuildUI();
        _ = LoadAsync();
    }

    private void BuildUI()
    {
        // ── Toolbar ──────────────────────────────────────────────────
        var toolbar = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.White, Padding = new Padding(10, 8, 10, 8) };
        toolbar.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, toolbar.Height - 1, toolbar.Width, toolbar.Height - 1);

        var lblTitle = new Label { Text = "💰  Payment Collection", Font = new Font("Segoe UI", 12, FontStyle.Bold), ForeColor = Color.FromArgb(15, 48, 96), AutoSize = true, Location = new Point(10, 12) };

        dtpDate = new DateTimePicker { Format = DateTimePickerFormat.Short, Width = 110, Location = new Point(230, 14), Font = new Font("Segoe UI", 9), Value = DateTime.Today };
        dtpDate.ValueChanged += async (_, _) => await LoadAsync();

        cmbCategory = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = 150, Location = new Point(350, 14), Font = new Font("Segoe UI", 9) };
        cmbCategory.Items.AddRange(["All Categories", "Clearance Fee", "Business Permit", "Certification Fee", "Blotter Fee", "Other"]);
        cmbCategory.SelectedIndex = 0;
        cmbCategory.SelectedIndexChanged += (_, _) => ApplyFilter();

        var btnRefresh = MakeButton("↻ Refresh", Color.FromArgb(59, 130, 246), 100);
        btnRefresh.Location = new Point(510, 12);
        btnRefresh.Click += async (_, _) => await LoadAsync();

        var btnNew = MakeButton("✚ Collect", Color.FromArgb(16, 185, 129), 100);
        btnNew.Location = new Point(620, 12);
        btnNew.Click += (_, _) => OpenCollectDialog();

        var btnPrint = MakeButton("🖨 Daily Report", Color.FromArgb(107, 114, 128), 120);
        btnPrint.Location = new Point(730, 12);
        btnPrint.Click += (_, _) => PrintDailyReport();

        toolbar.Controls.AddRange([lblTitle, dtpDate, cmbCategory, btnRefresh, btnNew, btnPrint]);

        // ── Summary cards ────────────────────────────────────────────
        var statsPanel = new Panel { Dock = DockStyle.Top, Height = 70, BackColor = Color.FromArgb(248, 250, 252), Padding = new Padding(10, 10, 10, 10) };
        statsPanel.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Color.FromArgb(226, 232, 240)), 0, statsPanel.Height - 1, statsPanel.Width, statsPanel.Height - 1);

        lblDaily   = MakeCard("Today's Collection", "₱0.00",  Color.FromArgb(16, 185, 129));
        lblMonthly = MakeCard("This Month",         "₱0.00",  Color.FromArgb(59, 130, 246));
        lblYearly  = MakeCard("This Year",          "₱0.00",  Color.FromArgb(139, 92, 246));
        lblCount   = MakeCard("Today's Transactions","0",     Color.FromArgb(245, 158, 11));

        lblDaily.Location   = new Point(10, 10);
        lblMonthly.Location = new Point(175, 10);
        lblYearly.Location  = new Point(340, 10);
        lblCount.Location   = new Point(505, 10);
        statsPanel.Controls.AddRange([lblDaily, lblMonthly, lblYearly, lblCount]);

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

        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colOR",     HeaderText = "OR #",       FillWeight = 80 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colPayer",  HeaderText = "Payer",      FillWeight = 150 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colCat",    HeaderText = "Category",   FillWeight = 110 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colDesc",   HeaderText = "Description",FillWeight = 140 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colAmt",    HeaderText = "Amount",     FillWeight = 80 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colMethod", HeaderText = "Method",     FillWeight = 70 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colStatus", HeaderText = "Status",     FillWeight = 70 });
        grid.Columns.Add(new DataGridViewTextBoxColumn { Name = "colTime",   HeaderText = "Time",       FillWeight = 80 });
        grid.Columns.Add(new DataGridViewButtonColumn  { Name = "colVoid",   HeaderText = "Action",     FillWeight = 60, UseColumnTextForButtonValue = false });

        grid.CellFormatting += Grid_CellFormatting;
        grid.CellClick += Grid_CellClick;

        Controls.Add(grid);
        Controls.Add(statsPanel);
        Controls.Add(toolbar);
    }

    private async Task LoadAsync()
    {
        try
        {
            var date = dtpDate.Value.ToString("yyyy-MM-dd");
            _all = await ApiClient.GetAsync<List<Payment>>($"/api/payments?date={date}") ?? [];

            // Also fetch summary
            var summary = await ApiClient.GetAsync<PaymentSummary>("/api/payments/summary");
            if (summary != null) UpdateCards(summary);

            ApplyFilter();
        }
        catch { /* silently ignore */ }
    }

    private void ApplyFilter()
    {
        var cat = cmbCategory.SelectedItem?.ToString() ?? "All Categories";
        var list = cat == "All Categories" ? _all : _all.Where(p => p.Category == cat).ToList();
        PopulateGrid(list);
    }

    private void PopulateGrid(List<Payment> list)
    {
        if (grid.InvokeRequired) { grid.Invoke(() => PopulateGrid(list)); return; }
        grid.Rows.Clear();
        foreach (var p in list.OrderByDescending(x => x.PaidAt))
        {
            var i = grid.Rows.Add(
                p.OrNumber,
                p.PayerName,
                p.Category,
                p.Description,
                $"₱{p.Amount:N2}",
                p.PaymentMethod,
                p.Status,
                p.PaidAt.ToLocalTime().ToString("hh:mm tt")
            );
            grid.Rows[i].Cells["colVoid"].Value = p.Status == "Paid" ? "Void" : "—";
            grid.Rows[i].Tag = p;
        }

        // Update today count label
        var todayPaid = list.Where(p => p.Status == "Paid").ToList();
        if (lblCount.InvokeRequired) return;
        lblCount.Text = $"Today's Transactions\n{todayPaid.Count}";
        lblDaily.Text = $"Today's Collection\n₱{todayPaid.Sum(p => p.Amount):N2}";
    }

    private void UpdateCards(PaymentSummary s)
    {
        if (lblMonthly.InvokeRequired) { lblMonthly.Invoke(() => UpdateCards(s)); return; }
        lblMonthly.Text = $"This Month\n₱{s.MonthlyTotal:N2}";
        lblYearly.Text  = $"This Year\n₱{s.YearlyTotal:N2}";
    }

    private async void Grid_CellClick(object? sender, DataGridViewCellEventArgs e)
    {
        if (e.RowIndex < 0 || e.ColumnIndex != grid.Columns["colVoid"].Index) return;
        var p = grid.Rows[e.RowIndex].Tag as Payment;
        if (p == null || p.Status != "Paid") return;

        // Simple input dialog for void reason
        var reason = ShowInputDialog("Enter void reason:", "Void Payment");
        if (string.IsNullOrWhiteSpace(reason)) return;

        try
        {
            await ApiClient.PatchAsync($"/api/payments/{p.Id}/void", reason);
            await LoadAsync();
        }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Error"); }
    }

    private static string? ShowInputDialog(string prompt, string title)
    {
        var form = new Form { Text = title, Size = new Size(360, 140), StartPosition = FormStartPosition.CenterParent, FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false, BackColor = Color.White };
        var lbl = new Label { Text = prompt, Location = new Point(12, 14), AutoSize = true, Font = new Font("Segoe UI", 9) };
        var txt = new TextBox { Location = new Point(12, 36), Width = 320, Font = new Font("Segoe UI", 9) };
        var btnOk = new Button { Text = "OK", DialogResult = DialogResult.OK, Location = new Point(160, 68), Size = new Size(80, 28), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(59, 130, 246), ForeColor = Color.White };
        btnOk.FlatAppearance.BorderSize = 0;
        var btnCancel = new Button { Text = "Cancel", DialogResult = DialogResult.Cancel, Location = new Point(252, 68), Size = new Size(80, 28), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(229, 231, 235) };
        btnCancel.FlatAppearance.BorderSize = 0;
        form.Controls.AddRange([lbl, txt, btnOk, btnCancel]);
        form.AcceptButton = btnOk; form.CancelButton = btnCancel;
        return form.ShowDialog() == DialogResult.OK ? txt.Text : null;
    }

    private void OpenCollectDialog()
    {
        using var dlg = new PaymentCollectDialog();
        if (dlg.ShowDialog() == DialogResult.OK)
            _ = LoadAsync();
    }

    private void PrintDailyReport()
    {
        var date = dtpDate.Value.ToString("MMMM d, yyyy");
        var paid = _all.Where(p => p.Status == "Paid").ToList();
        var total = paid.Sum(p => p.Amount);

        var rows = string.Join("", paid.Select(p =>
            $"<tr><td>{p.OrNumber}</td><td>{p.PayerName}</td><td>{p.Category}</td>" +
            $"<td>{p.Description}</td><td style='text-align:right'>₱{p.Amount:N2}</td>" +
            $"<td>{p.PaymentMethod}</td><td>{p.PaidAt.ToLocalTime():hh:mm tt}</td></tr>"));

        var html = $@"<html><head><style>
body{{font-family:Arial,sans-serif;font-size:11px;margin:20px}}
h2,h3{{text-align:center;margin:4px 0}}
table{{width:100%;border-collapse:collapse;margin-top:12px}}
th,td{{border:1px solid #ccc;padding:5px 8px}}
th{{background:#f1f5f9;font-weight:bold}}
.total{{text-align:right;font-weight:bold;font-size:13px;margin-top:8px}}
</style></head><body>
<h2>Barangay Damolog — Daily Collection Report</h2>
<h3>{date}</h3>
<table><thead><tr><th>OR #</th><th>Payer</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Time</th></tr></thead>
<tbody>{rows}</tbody></table>
<div class='total'>Total Collections: ₱{total:N2} ({paid.Count} transactions)</div>
</body></html>";

        var tmp = Path.Combine(Path.GetTempPath(), "daily_report.html");
        File.WriteAllText(tmp, html);
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(tmp) { UseShellExecute = true });
    }

    private void Grid_CellFormatting(object? sender, DataGridViewCellFormattingEventArgs e)
    {
        if (e.RowIndex < 0) return;
        var p = grid.Rows[e.RowIndex].Tag as Payment;
        if (p == null) return;

        if (grid.Columns[e.ColumnIndex].Name == "colStatus")
        {
            e.CellStyle.ForeColor = p.Status == "Voided" ? Color.FromArgb(185, 28, 28) : Color.FromArgb(6, 95, 70);
            e.CellStyle.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        }
        if (p.Status == "Voided")
            grid.Rows[e.RowIndex].DefaultCellStyle.ForeColor = Color.FromArgb(156, 163, 175);
    }

    private static Button MakeButton(string text, Color bg, int width = 120)
    {
        var b = new Button
        {
            Text = text, Size = new Size(width, 30),
            FlatStyle = FlatStyle.Flat, BackColor = bg,
            ForeColor = Color.White, Font = new Font("Segoe UI", 9),
            Cursor = Cursors.Hand
        };
        b.FlatAppearance.BorderSize = 0;
        return b;
    }

    private static Label MakeCard(string label, string value, Color color)
    {
        return new Label
        {
            Text = $"{label}\n{value}",
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = color,
            AutoSize = false,
            Size = new Size(155, 50),
            TextAlign = ContentAlignment.MiddleLeft
        };
    }
}
