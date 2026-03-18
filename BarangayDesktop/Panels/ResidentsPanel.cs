using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BarangayDesktop;

public class ResidentsPanel : Panel
{
    private DataGridView grid = null!;
    private TextBox txtSearch = null!;
    private ComboBox cmbSitio = null!;
    private Label lblCount = null!, lblTotal = null!, lblVoters = null!, lblSenior = null!, lblPwd = null!;
    private List<Resident> residents = [];

    public ResidentsPanel()
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
            BackColor = Color.FromArgb(15, 48, 96), Padding = new Padding(12, 0, 12, 0),
            Margin = new Padding(0)
        };
        for (int i = 0; i < 4; i++) strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        lblTotal  = StripStat(strip, "👥 Total Residents", "0", 0);
        lblVoters = StripStat(strip, "🗳 Registered Voters", "0", 1);
        lblSenior = StripStat(strip, "👴 Senior Citizens", "0", 2);
        lblPwd    = StripStat(strip, "♿ PWD", "0", 3);

        // ── Toolbar ───────────────────────────────────────────────────
        var toolbar = new Panel
        {
            Dock = DockStyle.Top, Height = 52,
            BackColor = Color.White,
            Padding = new Padding(10, 0, 10, 0)
        };
        toolbar.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(229, 231, 235));
            e.Graphics.DrawLine(pen, 0, toolbar.Height - 1, toolbar.Width, toolbar.Height - 1);
        };

        txtSearch = new TextBox
        {
            PlaceholderText = "🔍  Search name, address, household…",
            Width = 260, Height = 30, Location = new Point(10, 11),
            Font = new Font("Segoe UI", 9), BorderStyle = BorderStyle.FixedSingle
        };
        txtSearch.TextChanged += (_, _) => FilterGrid();

        cmbSitio = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList, Width = 140,
            Location = new Point(280, 11), Font = new Font("Segoe UI", 9)
        };
        cmbSitio.Items.Add("All Sitios");
        foreach (var s in new[] { "Proper", "Kalubihan", "Highlander", "Colo", "Kalusayan", "Patag", "Damolog Gamay", "Lantawan" })
            cmbSitio.Items.Add(s);
        cmbSitio.SelectedIndex = 0;
        cmbSitio.SelectedIndexChanged += (_, _) => FilterGrid();

        lblCount = new Label
        {
            Text = "0 residents", AutoSize = true,
            Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(107, 114, 128),
            Location = new Point(432, 16)
        };

        // Right-side action buttons — anchored
        var btnRefresh = ToolBtn("↻", Color.FromArgb(100, 116, 139));
        var btnAdd     = ToolBtn("+ Add Resident", Color.FromArgb(22, 163, 74));
        var btnEdit    = ToolBtn("✏ Edit", Color.FromArgb(37, 99, 235));
        var btnDelete  = ToolBtn("🗑 Delete", Color.FromArgb(185, 28, 28));

        btnAdd.Width = 120; btnEdit.Width = 80; btnDelete.Width = 90; btnRefresh.Width = 36;

        btnAdd.Click     += (_, _) => OpenForm(null);
        btnEdit.Click    += (_, _) => { if (SelectedResident() is { } r) OpenForm(r); };
        btnDelete.Click  += async (_, _) => await DeleteAsync();
        btnRefresh.Click += async (_, _) => await LoadAsync();

        // Anchor buttons to right
        btnRefresh.Anchor = btnAdd.Anchor = btnEdit.Anchor = btnDelete.Anchor =
            AnchorStyles.Top | AnchorStyles.Right;

        toolbar.Controls.AddRange([txtSearch, cmbSitio, lblCount, btnAdd, btnEdit, btnDelete, btnRefresh]);
        toolbar.Resize += (_, _) =>
        {
            int right = toolbar.Width - 10;
            btnRefresh.Location = new Point(right - 36, 11);
            btnDelete.Location  = new Point(right - 136, 11);
            btnEdit.Location    = new Point(right - 226, 11);
            btnAdd.Location     = new Point(right - 356, 11);
        };

        // ── Grid ──────────────────────────────────────────────────────
        var gridWrapper = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, Padding = new Padding(0) };

        grid = new DataGridView
        {
            Dock = DockStyle.Fill, ReadOnly = true,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.None,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            AllowUserToAddRows = false, BackgroundColor = Color.White,
            BorderStyle = BorderStyle.None, RowHeadersVisible = false,
            Font = new Font("Segoe UI", 9f), ColumnHeadersHeight = 34,
            RowTemplate = { Height = 30 }, GridColor = Color.FromArgb(243, 244, 246),
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal
        };
        grid.ColumnHeadersDefaultCellStyle.BackColor    = Color.FromArgb(248, 250, 252);
        grid.ColumnHeadersDefaultCellStyle.ForeColor    = Color.FromArgb(71, 85, 105);
        grid.ColumnHeadersDefaultCellStyle.Font         = new Font("Segoe UI", 8.5f, FontStyle.Bold);
        grid.ColumnHeadersDefaultCellStyle.Padding      = new Padding(8, 0, 0, 0);
        grid.DefaultCellStyle.Padding                   = new Padding(8, 0, 0, 0);
        grid.DefaultCellStyle.SelectionBackColor        = Color.FromArgb(219, 234, 254);
        grid.DefaultCellStyle.SelectionForeColor        = Color.FromArgb(30, 58, 138);
        grid.AlternatingRowsDefaultCellStyle.BackColor  = Color.FromArgb(249, 250, 251);
        grid.EnableHeadersVisualStyles = false;

        grid.Columns.AddRange(
            new DataGridViewTextBoxColumn { Name = "Id",      Visible = false },
            new DataGridViewTextBoxColumn { Name = "Name",    HeaderText = "Full Name",  Width = 190 },
            new DataGridViewTextBoxColumn { Name = "Age",     HeaderText = "Age",        Width = 48  },
            new DataGridViewTextBoxColumn { Name = "Gender",  HeaderText = "Sex",        Width = 60  },
            new DataGridViewTextBoxColumn { Name = "Civil",   HeaderText = "Civil",      Width = 75  },
            new DataGridViewTextBoxColumn { Name = "Sitio",   HeaderText = "Sitio",      Width = 120 },
            new DataGridViewTextBoxColumn { Name = "HH",      HeaderText = "HH#",        Width = 55  },
            new DataGridViewTextBoxColumn { Name = "Address", HeaderText = "Address",    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill },
            new DataGridViewTextBoxColumn { Name = "Contact", HeaderText = "Contact",    Width = 115 },
            new DataGridViewTextBoxColumn { Name = "Tags",    HeaderText = "Tags",       Width = 140 }
        );

        // Color-code tags column on paint
        grid.CellFormatting += (_, e) =>
        {
            if (e.ColumnIndex != grid.Columns["Tags"]!.Index || e.Value is null) return;
            var val = e.Value.ToString() ?? "";
            e.CellStyle!.ForeColor = val.Length > 0 ? Color.FromArgb(37, 99, 235) : Color.FromArgb(156, 163, 175);
            e.CellStyle.Font = val.Length > 0 ? new Font("Segoe UI", 8.5f, FontStyle.Bold) : new Font("Segoe UI", 8.5f);
        };

        // Alternate row highlight on hover
        grid.CellMouseEnter += (_, e) =>
        {
            if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.FromArgb(239, 246, 255);
        };
        grid.CellMouseLeave += (_, e) =>
        {
            if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor =
                e.RowIndex % 2 == 0 ? Color.White : Color.FromArgb(249, 250, 251);
        };

        gridWrapper.Controls.Add(grid);

        Controls.Add(gridWrapper);
        Controls.Add(toolbar);
        Controls.Add(strip);
    }

    private static Label StripStat(TableLayoutPanel strip, string title, string value, int col)
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
            Font = new Font("Segoe UI", 15, FontStyle.Bold), ForeColor = Color.White,
            Location = new Point(0, 18)
        };
        cell.Controls.Add(lbl);
        strip.Controls.Add(cell, col, 0);
        return lbl;
    }

    private static Button ToolBtn(string text, Color bg) => new()
    {
        Text = text, Height = 30, BackColor = bg, ForeColor = Color.White,
        FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
        Cursor = Cursors.Hand, FlatAppearance = { BorderSize = 0 }
    };

    private async Task LoadAsync()
    {
        try
        {
            residents = await ApiClient.GetListAsync<Resident>("api/residents");
            FilterGrid();
            UpdateStrip();
        }
        catch { }
    }

    private void UpdateStrip()
    {
        lblTotal.Text  = residents.Count.ToString("N0");
        lblVoters.Text = residents.Count(r => r.IsVoter).ToString("N0");
        lblSenior.Text = residents.Count(r => r.IsSenior).ToString("N0");
        lblPwd.Text    = residents.Count(r => r.IsPWD).ToString("N0");
    }

    private void FilterGrid()
    {
        var q = txtSearch.Text.ToLower();
        var sitio = cmbSitio.SelectedIndex > 0 ? cmbSitio.SelectedItem?.ToString() : null;

        var filtered = residents.Where(r =>
            (sitio is null || r.Sitio == sitio) &&
            (string.IsNullOrWhiteSpace(q) ||
             r.FullName.ToLower().Contains(q) ||
             r.Address.ToLower().Contains(q) ||
             r.HouseholdNo.ToLower().Contains(q))
        ).ToList();

        grid.Rows.Clear();
        foreach (var r in filtered)
        {
            var tags = string.Join("  ", new[] {
                r.IsVoter  ? "● Voter"  : "",
                r.IsSenior ? "● Senior" : "",
                r.IsPWD    ? "● PWD"    : "",
                r.Is4Ps    ? "● 4Ps"    : ""
            }.Where(t => t != ""));

            grid.Rows.Add(r.Id, r.FullName, r.Age, r.Gender, r.CivilStatus,
                r.Sitio, r.HouseholdNo, r.Address, r.ContactNumber,
                string.IsNullOrEmpty(tags) ? "—" : tags);
        }
        lblCount.Text = $"{filtered.Count} resident{(filtered.Count != 1 ? "s" : "")}";
    }

    private Resident? SelectedResident()
    {
        if (grid.SelectedRows.Count == 0) return null;
        var id = (int)grid.SelectedRows[0].Cells["Id"].Value;
        return residents.FirstOrDefault(r => r.Id == id);
    }

    private void OpenForm(Resident? resident)
    {
        var form = new ResidentForm(resident);
        if (form.ShowDialog() == DialogResult.OK) _ = LoadAsync();
    }

    private async Task DeleteAsync()
    {
        var r = SelectedResident();
        if (r is null) { MessageBox.Show("Select a resident first.", "Info"); return; }
        if (MessageBox.Show($"Delete {r.FullName}?", "Confirm Delete",
            MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
        await ApiClient.DeleteAsync($"api/residents/{r.Id}");
        await LoadAsync();
    }
}
