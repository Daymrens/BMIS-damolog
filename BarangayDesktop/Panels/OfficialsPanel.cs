using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace BarangayDesktop;

public class OfficialsPanel : Panel
{
    private DataGridView grid = null!;
    private List<Official> officials = [];
    private Label lblTotal = null!, lblActive = null!, lblCaptain = null!;

    public OfficialsPanel()
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
            Dock = DockStyle.Top, Height = 56, ColumnCount = 3,
            BackColor = Color.FromArgb(15, 48, 96), Padding = new Padding(12, 0, 12, 0)
        };
        for (int i = 0; i < 3; i++) strip.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.3f));
        lblTotal   = StripStat(strip, "🏛 Total Officials",  "0", 0);
        lblActive  = StripStat(strip, "✅ Active",            "0", 1);
        lblCaptain = StripStat(strip, "👑 Punong Barangay",  "—", 2);

        // ── Toolbar ───────────────────────────────────────────────────
        var toolbar = new Panel
        {
            Dock = DockStyle.Top, Height = 52,
            BackColor = Color.White
        };
        toolbar.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(229, 231, 235));
            e.Graphics.DrawLine(pen, 0, toolbar.Height - 1, toolbar.Width, toolbar.Height - 1);
        };

        var btnAdd    = ToolBtn("+ Add Official", Color.FromArgb(22, 163, 74));
        var btnEdit   = ToolBtn("✏ Edit",         Color.FromArgb(37, 99, 235));
        var btnDelete = ToolBtn("🗑 Delete",       Color.FromArgb(185, 28, 28));
        var btnRefresh = ToolBtn("↻",             Color.FromArgb(100, 116, 139));

        btnAdd.Width = 120; btnEdit.Width = 80; btnDelete.Width = 90; btnRefresh.Width = 36;

        btnAdd.Click     += (_, _) => OpenForm(null);
        btnEdit.Click    += (_, _) => { if (Selected() is { } o) OpenForm(o); };
        btnDelete.Click  += async (_, _) => await DeleteAsync();
        btnRefresh.Click += async (_, _) => await LoadAsync();

        toolbar.Controls.AddRange([btnAdd, btnEdit, btnDelete, btnRefresh]);
        toolbar.Resize += (_, _) =>
        {
            int right = toolbar.Width - 10;
            btnRefresh.Location = new Point(right - 36,  11);
            btnDelete.Location  = new Point(right - 136, 11);
            btnEdit.Location    = new Point(right - 226, 11);
            btnAdd.Location     = new Point(right - 356, 11);
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
            new DataGridViewTextBoxColumn { Name = "Id",       Visible = false },
            new DataGridViewTextBoxColumn { Name = "Name",     HeaderText = "Name",       Width = 200 },
            new DataGridViewTextBoxColumn { Name = "Position", HeaderText = "Position",   Width = 180 },
            new DataGridViewTextBoxColumn { Name = "Contact",  HeaderText = "Contact No.", Width = 140 },
            new DataGridViewTextBoxColumn { Name = "Start",    HeaderText = "Term Start", Width = 110 },
            new DataGridViewTextBoxColumn { Name = "End",      HeaderText = "Term End",   Width = 110 },
            new DataGridViewTextBoxColumn { Name = "Status",   HeaderText = "Status",     Width = 90  }
        );

        // Color-code Status and Position columns
        grid.CellFormatting += (_, e) =>
        {
            if (e.RowIndex < 0) return;
            if (e.ColumnIndex == grid.Columns["Status"]!.Index)
            {
                var val = e.Value?.ToString() ?? "";
                e.CellStyle!.ForeColor    = val == "Active" ? Color.FromArgb(22, 163, 74) : Color.FromArgb(156, 163, 175);
                e.CellStyle.Font          = new Font("Segoe UI", 9, FontStyle.Bold);
                e.CellStyle.BackColor     = val == "Active" ? Color.FromArgb(240, 253, 244) : Color.FromArgb(249, 250, 251);
            }
            if (e.ColumnIndex == grid.Columns["Position"]!.Index)
            {
                var val = e.Value?.ToString() ?? "";
                if (val == "Punong Barangay")
                {
                    e.CellStyle!.ForeColor = Color.FromArgb(146, 64, 14);
                    e.CellStyle.Font       = new Font("Segoe UI", 9, FontStyle.Bold);
                }
            }
        };

        grid.CellMouseEnter += (_, e) =>
        {
            if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor = Color.FromArgb(239, 246, 255);
        };
        grid.CellMouseLeave += (_, e) =>
        {
            if (e.RowIndex >= 0) grid.Rows[e.RowIndex].DefaultCellStyle.BackColor =
                e.RowIndex % 2 == 0 ? Color.White : Color.FromArgb(249, 250, 251);
        };

        Controls.Add(grid);
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
            officials = await ApiClient.GetListAsync<Official>("api/officials");
            grid.Rows.Clear();
            foreach (var o in officials)
            {
                grid.Rows.Add(
                    o.Id, o.Name, o.Position, o.ContactNumber,
                    o.TermStart.ToString("MM/dd/yyyy"),
                    o.TermEnd.ToString("MM/dd/yyyy"),
                    o.IsActive ? "Active" : "Inactive"
                );
            }
            UpdateStrip();
        }
        catch { }
    }

    private void UpdateStrip()
    {
        lblTotal.Text   = officials.Count.ToString();
        lblActive.Text  = officials.Count(o => o.IsActive).ToString();
        var captain     = officials.FirstOrDefault(o => o.Position.Contains("Punong", StringComparison.OrdinalIgnoreCase));
        lblCaptain.Text = captain is not null ? captain.Name.Split(' ')[0] + "…" : "—";
    }

    private Official? Selected()
    {
        if (grid.SelectedRows.Count == 0) return null;
        var id = (int)grid.SelectedRows[0].Cells["Id"].Value;
        return officials.FirstOrDefault(o => o.Id == id);
    }

    private void OpenForm(Official? official)
    {
        var form = new OfficialForm(official);
        if (form.ShowDialog() == DialogResult.OK) _ = LoadAsync();
    }

    private async Task DeleteAsync()
    {
        var o = Selected();
        if (o is null) { MessageBox.Show("Select an official first.", "Info"); return; }
        if (MessageBox.Show($"Delete {o.Name}?", "Confirm Delete",
            MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
        await ApiClient.DeleteAsync($"api/officials/{o.Id}");
        await LoadAsync();
    }
}
