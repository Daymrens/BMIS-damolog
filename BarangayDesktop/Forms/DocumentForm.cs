using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class DocumentForm : Form
{
    private ComboBox cmbResident = null!, cmbType = null!;
    private TextBox txtPurpose = null!, txtIssuedBy = null!;
    private List<Resident> residents = [];

    public DocumentForm()
    {
        Text = "Issue Document";
        Size = new Size(480, 400);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        BackColor = Color.White;
        BuildUI();
        _ = LoadResidentsAsync();
    }

    private void BuildUI()
    {
        // ── Header ────────────────────────────────────────────────────
        var header = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.FromArgb(15, 48, 96) };
        header.Controls.Add(new Label
        {
            Text = "📄  Issue Document",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(16, 14)
        });

        // ── Body ──────────────────────────────────────────────────────
        var body = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 2,
            Padding = new Padding(24, 16, 24, 0), BackColor = Color.White
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        Section(body, "📋  Document Details");

        body.Controls.Add(Lbl("Resident *"));
        cmbResident = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(cmbResident);

        body.Controls.Add(Lbl("Document Type *"));
        cmbType = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        cmbType.Items.AddRange(["Barangay Clearance", "Certificate of Indigency", "Certificate of Residency"]);
        body.Controls.Add(cmbType);

        body.Controls.Add(Lbl("Purpose *"));
        txtPurpose = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6), PlaceholderText = "e.g. Employment, School Enrollment…" };
        body.Controls.Add(txtPurpose);

        body.Controls.Add(Lbl("Issued By"));
        txtIssuedBy = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(txtIssuedBy);

        // ── Footer ────────────────────────────────────────────────────
        var footer = new Panel { Dock = DockStyle.Bottom, Height = 56, BackColor = Color.FromArgb(248, 250, 252) };
        footer.Paint += (_, e) => { using var pen = new Pen(Color.FromArgb(229, 231, 235)); e.Graphics.DrawLine(pen, 0, 0, footer.Width, 0); };

        var btnCancel = new Button
        {
            Text = "Cancel", DialogResult = DialogResult.Cancel,
            Size = new Size(90, 36), FlatStyle = FlatStyle.Flat,
            BackColor = Color.White, ForeColor = Color.FromArgb(71, 85, 105),
            Font = new Font("Segoe UI", 9), Cursor = Cursors.Hand,
            Anchor = AnchorStyles.Right | AnchorStyles.Top
        };
        btnCancel.FlatAppearance.BorderColor = Color.FromArgb(209, 213, 219);

        var btnSave = new Button
        {
            Text = "📄  Issue", Size = new Size(110, 36), FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(15, 48, 96), ForeColor = Color.White,
            Font = new Font("Segoe UI", 9, FontStyle.Bold), Cursor = Cursors.Hand,
            Anchor = AnchorStyles.Right | AnchorStyles.Top
        };
        btnSave.FlatAppearance.BorderSize = 0;
        btnSave.Click += async (_, _) => await SaveAsync();

        footer.Controls.AddRange([btnCancel, btnSave]);
        footer.Resize += (_, _) =>
        {
            btnSave.Location   = new Point(footer.Width - 120, 10);
            btnCancel.Location = new Point(footer.Width - 220, 10);
        };

        Controls.Add(body);
        Controls.Add(footer);
        Controls.Add(header);
    }

    private static void Section(TableLayoutPanel t, string text)
    {
        var lbl = new Label
        {
            Text = text, AutoSize = false, Size = new Size(400, 28),
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            BackColor = Color.FromArgb(241, 245, 249),
            Padding = new Padding(4, 4, 0, 0),
            Margin = new Padding(0, 0, 0, 8)
        };
        t.SetColumnSpan(lbl, 2);
        t.Controls.Add(lbl);
    }

    private static Label Lbl(string text) => new()
    {
        Text = text, AutoSize = true,
        Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(71, 85, 105),
        Anchor = AnchorStyles.Left | AnchorStyles.Top,
        Margin = new Padding(0, 8, 0, 0)
    };

    private async Task LoadResidentsAsync()
    {
        try
        {
            residents = await ApiClient.GetListAsync<Resident>("api/residents");
            Invoke(() =>
            {
                cmbResident.DataSource = residents;
                cmbResident.DisplayMember = "FullName";
                cmbResident.ValueMember = "Id";
            });
        }
        catch { }
    }

    private async Task SaveAsync()
    {
        if (cmbResident.SelectedItem is not Resident r)
        { MessageBox.Show("Select a resident.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
        if (cmbType.SelectedItem is null)
        { MessageBox.Show("Select a document type.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        var doc = new Document
        {
            ResidentId   = r.Id,
            DocumentType = cmbType.SelectedItem?.ToString() ?? "",
            Purpose      = txtPurpose.Text.Trim(),
            IssuedBy     = txtIssuedBy.Text.Trim()
        };

        try
        {
            await ApiClient.PostAsync<Document>("api/documents", doc);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) { MessageBox.Show($"Save failed: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
