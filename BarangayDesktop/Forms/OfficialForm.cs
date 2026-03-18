using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class OfficialForm : Form
{
    private readonly Official? _existing;
    private TextBox txtName = null!, txtPosition = null!, txtContact = null!;
    private DateTimePicker dtpStart = null!, dtpEnd = null!;
    private CheckBox chkActive = null!;

    private static readonly string[] Positions =
    [
        "Punong Barangay", "Barangay Kagawad", "Barangay Secretary",
        "Barangay Treasurer", "SK Chairperson", "SK Kagawad"
    ];

    public OfficialForm(Official? existing)
    {
        _existing = existing;
        Text = existing is null ? "Add Official" : "Edit Official";
        Size = new Size(480, 420);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        BackColor = Color.White;
        BuildUI();
        if (existing is not null) Populate(existing);
    }

    private void BuildUI()
    {
        // ── Header ────────────────────────────────────────────────────
        var header = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.FromArgb(15, 48, 96) };
        header.Controls.Add(new Label
        {
            Text = _existing is null ? "➕  Add Official" : "✏  Edit Official",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(16, 14)
        });

        // ── Body ──────────────────────────────────────────────────────
        var body = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 2,
            Padding = new Padding(28, 16, 20, 0),
            BackColor = Color.White
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        // Section header
        var sec = new Label
        {
            Text = "🏛  Official Details", AutoSize = false,
            Size = new Size(400, 28),
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            BackColor = Color.FromArgb(241, 245, 249),
            Padding = new Padding(4, 4, 0, 0),
            Margin = new Padding(0, 0, 0, 8)
        };
        body.SetColumnSpan(sec, 2);
        body.Controls.Add(sec);

        // Name
        body.Controls.Add(Lbl("Full Name *"));
        txtName = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(txtName);

        // Position
        body.Controls.Add(Lbl("Position *"));
        var cmbPos = new ComboBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        cmbPos.Items.AddRange(Positions);
        cmbPos.DropDownStyle = ComboBoxStyle.DropDownList;
        body.Controls.Add(cmbPos);
        // Wire up so txtPosition tracks the combo
        cmbPos.SelectedIndexChanged += (_, _) => txtPosition.Text = cmbPos.SelectedItem?.ToString() ?? "";
        txtPosition = new TextBox { Visible = false }; // hidden backing field

        // Contact
        body.Controls.Add(Lbl("Contact No."));
        txtContact = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(txtContact);

        // Term dates
        var termSec = new Label
        {
            Text = "📅  Term Period", AutoSize = false, Size = new Size(400, 28),
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            BackColor = Color.FromArgb(241, 245, 249),
            Padding = new Padding(4, 4, 0, 0),
            Margin = new Padding(0, 8, 0, 8)
        };
        body.SetColumnSpan(termSec, 2);
        body.Controls.Add(termSec);

        body.Controls.Add(Lbl("Term Start"));
        dtpStart = new DateTimePicker { Format = DateTimePickerFormat.Short, Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(dtpStart);

        body.Controls.Add(Lbl("Term End"));
        dtpEnd = new DateTimePicker { Format = DateTimePickerFormat.Short, Dock = DockStyle.Fill, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 6) };
        body.Controls.Add(dtpEnd);

        body.Controls.Add(Lbl("Status"));
        chkActive = new CheckBox
        {
            Text = "Active Official", Checked = true,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(22, 163, 74),
            Dock = DockStyle.Fill, Margin = new Padding(0, 6, 0, 0)
        };
        body.Controls.Add(chkActive);

        // Populate position combo if editing
        if (_existing is not null)
        {
            var idx = Array.IndexOf(Positions, _existing.Position);
            if (idx >= 0) cmbPos.SelectedIndex = idx;
            else { cmbPos.Items.Add(_existing.Position); cmbPos.SelectedItem = _existing.Position; }
        }

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
            Text = "💾  Save", Size = new Size(110, 36), FlatStyle = FlatStyle.Flat,
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

    private static Label Lbl(string text) => new()
    {
        Text = text, AutoSize = true,
        Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(71, 85, 105),
        Anchor = AnchorStyles.Left | AnchorStyles.Top,
        Margin = new Padding(0, 8, 0, 0)
    };

    private void Populate(Official o)
    {
        txtName.Text = o.Name;
        txtPosition.Text = o.Position;
        txtContact.Text = o.ContactNumber;
        dtpStart.Value = o.TermStart == default ? DateTime.Today : o.TermStart;
        dtpEnd.Value   = o.TermEnd   == default ? DateTime.Today.AddYears(3) : o.TermEnd;
        chkActive.Checked = o.IsActive;
    }

    private async Task SaveAsync()
    {
        if (string.IsNullOrWhiteSpace(txtName.Text))
        { MessageBox.Show("Name is required.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        var official = new Official
        {
            Id = _existing?.Id ?? 0,
            Name = txtName.Text.Trim(),
            Position = txtPosition.Text.Trim(),
            ContactNumber = txtContact.Text.Trim(),
            TermStart = dtpStart.Value,
            TermEnd = dtpEnd.Value,
            IsActive = chkActive.Checked
        };

        if (_existing is null) await ApiClient.PostAsync<Official>("api/officials", official);
        else await ApiClient.PutAsync($"api/officials/{official.Id}", official);

        DialogResult = DialogResult.OK;
        Close();
    }
}
