using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BarangayDesktop;

public class DocumentsPanel : Panel
{
    private DataGridView gridResidents = null!, gridDocs = null!;
    private List<Resident> residents = [];
    private List<Official> officials = [];
    private List<Blotter> blotters = [];
    private TextBox txtSearch = null!;
    private Label lblDocCount = null!, lblTodayCount = null!;

    private static readonly (string Full, string Short, Color Color)[] DocTypes =
    [
        ("Barangay Clearance",             "Clearance",   Color.FromArgb(37, 99, 235)),
        ("Certificate of Residency",       "Residency",   Color.FromArgb(22, 163, 74)),
        ("Certificate of Indigency",       "Indigency",   Color.FromArgb(217, 119, 6)),
        ("Barangay Business Clearance",    "Business",    Color.FromArgb(139, 92, 246)),
        ("Barangay Blotter Certification", "Blotter Cert",Color.FromArgb(220, 38, 38)),
    ];

    public DocumentsPanel()
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
            Dock = DockStyle.Top, Height = 56, ColumnCount = 2,
            BackColor = Color.FromArgb(15, 48, 96), Padding = new Padding(12, 0, 12, 0)
        };
        strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        lblDocCount   = StripStat(strip, "📄 Total Documents Issued", "0", 0);
        lblTodayCount = StripStat(strip, "📅 Issued Today",           "0", 1);

        // ── Main split ────────────────────────────────────────────────
        var split = new SplitContainer
        {
            Dock = DockStyle.Fill,
            Orientation = Orientation.Vertical,
            BackColor = Color.FromArgb(241, 245, 249)
        };
        split.HandleCreated += (_, _) =>
            split.SplitterDistance = Math.Max(50, (int)(split.Width * 0.42));

        // ════ LEFT PANEL ══════════════════════════════════════════════

        // Search bar
        var searchBar = new Panel
        {
            Dock = DockStyle.Top, Height = 48,
            BackColor = Color.White, Padding = new Padding(10, 9, 10, 0)
        };
        searchBar.Paint += BottomBorder;
        txtSearch = new TextBox
        {
            Dock = DockStyle.Fill, PlaceholderText = "🔍  Search resident…",
            Font = new Font("Segoe UI", 9), BorderStyle = BorderStyle.FixedSingle
        };
        txtSearch.TextChanged += (_, _) => FilterResidents();
        searchBar.Controls.Add(txtSearch);

        // Hint label
        var hintBar = new Panel { Dock = DockStyle.Top, Height = 30, BackColor = Color.FromArgb(239, 246, 255) };
        hintBar.Controls.Add(new Label
        {
            Text = "  👆  Select a resident, then click a document type below",
            Font = new Font("Segoe UI", 8, FontStyle.Italic),
            ForeColor = Color.FromArgb(37, 99, 235),
            Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft
        });

        // Doc type buttons
        var docFlow = new FlowLayoutPanel
        {
            Dock = DockStyle.Top, Height = 44,
            BackColor = Color.White, Padding = new Padding(8, 6, 8, 0),
            WrapContents = false, AutoScroll = true
        };
        docFlow.Paint += BottomBorder;
        foreach (var (full, shortName, color) in DocTypes)
        {
            var btn = new Button
            {
                Text = shortName, Tag = full, AutoSize = true, Height = 28,
                FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                BackColor = Color.FromArgb(20, color.R, color.G, color.B),
                ForeColor = color, Margin = new Padding(0, 0, 6, 0)
            };
            btn.FlatAppearance.BorderColor = Color.FromArgb(60, color.R, color.G, color.B);
            btn.FlatAppearance.BorderSize = 1;
            btn.Click += (s, _) => { if (s is Button b && b.Tag is string d) IssueForSelected(d); };
            docFlow.Controls.Add(btn);
        }

        // Resident grid
        gridResidents = new DataGridView
        {
            Dock = DockStyle.Fill, ReadOnly = true,
            AllowUserToAddRows = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            BackgroundColor = Color.White,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            RowHeadersVisible = false, BorderStyle = BorderStyle.None,
            Font = new Font("Segoe UI", 9), RowTemplate = { Height = 30 },
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
            GridColor = Color.FromArgb(243, 244, 246)
        };
        gridResidents.ColumnHeadersDefaultCellStyle.Font      = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        gridResidents.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
        gridResidents.ColumnHeadersDefaultCellStyle.ForeColor = Color.FromArgb(71, 85, 105);
        gridResidents.ColumnHeadersDefaultCellStyle.Padding   = new Padding(8, 0, 0, 0);
        gridResidents.DefaultCellStyle.Padding                = new Padding(8, 0, 0, 0);
        gridResidents.DefaultCellStyle.SelectionBackColor     = Color.FromArgb(219, 234, 254);
        gridResidents.DefaultCellStyle.SelectionForeColor     = Color.FromArgb(30, 58, 138);
        gridResidents.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(249, 250, 251);
        gridResidents.EnableHeadersVisualStyles = false;
        gridResidents.Columns.AddRange(
            new DataGridViewTextBoxColumn { HeaderText = "Name",    Name = "Name",    FillWeight = 45 },
            new DataGridViewTextBoxColumn { HeaderText = "Sitio",   Name = "Sitio",   FillWeight = 30 },
            new DataGridViewTextBoxColumn { HeaderText = "Address", Name = "Address", FillWeight = 55 }
        );
        gridResidents.CellDoubleClick += (_, e) => { if (e.RowIndex >= 0) ShowDocTypeMenu(e.RowIndex); };
        gridResidents.CellMouseEnter  += (_, e) => { if (e.RowIndex >= 0) gridResidents.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.FromArgb(239, 246, 255); };
        gridResidents.CellMouseLeave  += (_, e) => { if (e.RowIndex >= 0) gridResidents.Rows[e.RowIndex].DefaultCellStyle.BackColor = e.RowIndex % 2 == 0 ? Color.White : Color.FromArgb(249, 250, 251); };

        split.Panel1.Controls.Add(gridResidents);
        split.Panel1.Controls.Add(docFlow);
        split.Panel1.Controls.Add(searchBar);
        split.Panel1.Controls.Add(hintBar);

        // ════ RIGHT PANEL ═════════════════════════════════════════════

        var rightToolbar = new Panel
        {
            Dock = DockStyle.Top, Height = 48,
            BackColor = Color.White, Padding = new Padding(12, 0, 10, 0)
        };
        rightToolbar.Paint += BottomBorder;
        rightToolbar.Controls.Add(new Label
        {
            Text = "📋  Issued Documents Log",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            AutoSize = true, Location = new Point(12, 14)
        });
        var btnRefresh = new Button
        {
            Text = "↻", Width = 32, Height = 30, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(241, 245, 249), ForeColor = Color.FromArgb(71, 85, 105),
            Cursor = Cursors.Hand, Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        btnRefresh.FlatAppearance.BorderSize = 0;
        btnRefresh.Click += (_, _) => _ = LoadDocsAsync();
        rightToolbar.Controls.Add(btnRefresh);
        rightToolbar.Resize += (_, _) => btnRefresh.Location = new Point(rightToolbar.Width - 42, 9);

        gridDocs = new DataGridView
        {
            Dock = DockStyle.Fill, ReadOnly = true,
            AllowUserToAddRows = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            BackgroundColor = Color.White,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            RowHeadersVisible = false, BorderStyle = BorderStyle.None,
            Font = new Font("Segoe UI", 9), RowTemplate = { Height = 30 },
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
            GridColor = Color.FromArgb(243, 244, 246)
        };
        gridDocs.ColumnHeadersDefaultCellStyle.Font      = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        gridDocs.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(248, 250, 252);
        gridDocs.ColumnHeadersDefaultCellStyle.ForeColor = Color.FromArgb(71, 85, 105);
        gridDocs.ColumnHeadersDefaultCellStyle.Padding   = new Padding(8, 0, 0, 0);
        gridDocs.DefaultCellStyle.Padding                = new Padding(8, 0, 0, 0);
        gridDocs.DefaultCellStyle.SelectionBackColor     = Color.FromArgb(219, 234, 254);
        gridDocs.DefaultCellStyle.SelectionForeColor     = Color.FromArgb(30, 58, 138);
        gridDocs.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(249, 250, 251);
        gridDocs.EnableHeadersVisualStyles = false;
        gridDocs.Columns.AddRange(
            new DataGridViewTextBoxColumn { HeaderText = "Control No.",    FillWeight = 28 },
            new DataGridViewTextBoxColumn { HeaderText = "Resident",       FillWeight = 28 },
            new DataGridViewTextBoxColumn { HeaderText = "Document Type",  FillWeight = 32 },
            new DataGridViewTextBoxColumn { HeaderText = "Purpose",        FillWeight = 22 },
            new DataGridViewTextBoxColumn { HeaderText = "Issued By",      FillWeight = 22 },
            new DataGridViewTextBoxColumn { HeaderText = "Date",           FillWeight = 16 }
        );

        // Color-code document type column
        gridDocs.CellFormatting += (_, e) =>
        {
            if (e.ColumnIndex != 2 || e.RowIndex < 0 || e.Value is null) return;
            var val = e.Value.ToString() ?? "";
            var match = DocTypes.FirstOrDefault(d => d.Full == val);
            if (match.Full is not null)
            {
                e.CellStyle!.ForeColor = match.Color;
                e.CellStyle.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            }
        };

        split.Panel2.Controls.Add(gridDocs);
        split.Panel2.Controls.Add(rightToolbar);

        Controls.Add(split);
        Controls.Add(strip);
    }

    private static void BottomBorder(object? s, PaintEventArgs e)
    {
        if (s is not Control c) return;
        using var pen = new Pen(Color.FromArgb(229, 231, 235));
        e.Graphics.DrawLine(pen, 0, c.Height - 1, c.Width, c.Height - 1);
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

    private void ShowDocTypeMenu(int rowIndex)
    {
        var menu = new ContextMenuStrip();
        foreach (var (full, shortName, color) in DocTypes)
        {
            var item = new ToolStripMenuItem(shortName);
            var captured = full;
            item.Click += (_, _) => IssueForRow(rowIndex, captured);
            menu.Items.Add(item);
        }
        var cell = gridResidents.GetCellDisplayRectangle(0, rowIndex, true);
        menu.Show(gridResidents, new Point(cell.Right, cell.Top));
    }

    private void IssueForSelected(string docType)
    {
        if (gridResidents.SelectedRows.Count == 0)
        {
            MessageBox.Show("Please select a resident first.", "No Selection", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        IssueForRow(gridResidents.SelectedRows[0].Index, docType);
    }

    private void IssueForRow(int rowIndex, string docType)
    {
        var resident = gridResidents.Rows[rowIndex].Tag as Resident;
        if (resident is null) return;
        Blotter? blotter = null;
        if (docType == "Barangay Blotter Certification") blotter = PickBlotter();
        var dialog = new IssueDocumentDialog(resident, docType, officials, blotter);
        if (dialog.ShowDialog() == DialogResult.OK) _ = LoadDocsAsync();
    }

    private Blotter? PickBlotter()
    {
        if (blotters.Count == 0) return null;
        var picker = new Form
        {
            Text = "Select Blotter Case", Size = new Size(500, 300),
            StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false
        };
        var g = new DataGridView
        {
            Dock = DockStyle.Fill, ReadOnly = true, AllowUserToAddRows = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
        };
        g.DataSource = blotters.Select(b => new { b.CaseNumber, b.Complainant, b.Respondent, b.Incident, b.Status }).ToList();
        var btn = new Button { Text = "Select", Dock = DockStyle.Bottom, Height = 35, DialogResult = DialogResult.OK, BackColor = Color.FromArgb(37, 99, 235), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
        picker.Controls.AddRange([g, btn]);
        Blotter? selected = null;
        btn.Click += (_, _) =>
        {
            if (g.SelectedRows.Count > 0)
            {
                var cn = g.SelectedRows[0].Cells["CaseNumber"].Value?.ToString();
                selected = blotters.FirstOrDefault(b => b.CaseNumber == cn);
            }
        };
        picker.ShowDialog();
        return selected;
    }

    private void FilterResidents()
    {
        var q = txtSearch.Text.ToLower();
        var filtered = string.IsNullOrWhiteSpace(q)
            ? residents
            : residents.Where(r => $"{r.LastName} {r.FirstName}".ToLower().Contains(q) || r.Address.ToLower().Contains(q) || r.Sitio.ToLower().Contains(q)).ToList();
        gridResidents.Rows.Clear();
        foreach (var r in filtered)
        {
            var i = gridResidents.Rows.Add($"{r.LastName}, {r.FirstName} {r.MiddleName}".Trim(), r.Sitio, r.Address);
            gridResidents.Rows[i].Tag = r;
        }
    }

    private async Task LoadAsync()
    {
        try
        {
            residents = await ApiClient.GetListAsync<Resident>("api/residents");
            officials = await ApiClient.GetListAsync<Official>("api/officials");
            blotters  = await ApiClient.GetListAsync<Blotter>("api/blotters");
            Invoke(FilterResidents);
            await LoadDocsAsync();
        }
        catch { }
    }

    private async Task LoadDocsAsync()
    {
        try
        {
            var docs = await ApiClient.GetListAsync<Document>("api/documents");
            Invoke(() =>
            {
                gridDocs.Rows.Clear();
                foreach (var d in docs)
                {
                    var name = d.Resident is not null
                        ? $"{d.Resident.LastName}, {d.Resident.FirstName}"
                        : $"ID:{d.ResidentId}";
                    gridDocs.Rows.Add(d.ControlNumber, name, d.DocumentType, d.Purpose, d.IssuedBy, d.IssuedAt.ToString("MM/dd/yyyy"));
                }
                lblDocCount.Text   = docs.Count.ToString();
                lblTodayCount.Text = docs.Count(d => d.IssuedAt.Date == DateTime.Today).ToString();
            });
        }
        catch { }
    }
}
