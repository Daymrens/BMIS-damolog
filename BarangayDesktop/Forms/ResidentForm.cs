using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class ResidentForm : Form
{
    private readonly Resident? _existing;
    private TextBox txtFirst = null!, txtLast = null!, txtMiddle = null!;
    private TextBox txtAddress = null!, txtContact = null!, txtEmail = null!;
    private TextBox txtHousehold = null!, txtOccupation = null!;
    private DateTimePicker dtpBirth = null!;
    private ComboBox cmbGender = null!, cmbCivil = null!, cmbSitio = null!;
    private CheckBox chkVoter = null!, chkSenior = null!, chkPWD = null!, chk4Ps = null!;

    private static readonly string[] Sitios =
        ["Proper","Kalubihan","Highlander","Colo","Kalusayan","Patag","Damolog Gamay","Lantawan"];

    public ResidentForm(Resident? existing)
    {
        _existing = existing;
        Text = existing is null ? "Add Resident" : "Edit Resident";
        Size = new Size(540, 640);
        MinimumSize = new Size(540, 500);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.Sizable;
        MaximizeBox = false;
        BackColor = Color.White;
        BuildUI();
        if (existing is not null) Populate(existing);
    }

    private void BuildUI()
    {
        // ── Header band ───────────────────────────────────────────────
        var header = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.FromArgb(15, 48, 96) };
        header.Controls.Add(new Label
        {
            Text = _existing is null ? "➕  Add New Resident" : "✏  Edit Resident",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(16, 14)
        });

        // ── Scrollable body ───────────────────────────────────────────
        var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = Color.White, Padding = new Padding(20, 12, 20, 0) };

        var body = new TableLayoutPanel
        {
            AutoSize = true, ColumnCount = 2, Width = 460,
            BackColor = Color.White, Padding = new Padding(8, 0, 0, 0)
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 310));

        Section(body, "👤  Personal Information");
        txtLast   = Field(body, "Last Name *");
        txtFirst  = Field(body, "First Name *");
        txtMiddle = Field(body, "Middle Name");
        Lbl(body, "Birth Date");
        dtpBirth = new DateTimePicker { Format = DateTimePickerFormat.Short, Width = 310, Font = new Font("Segoe UI", 9) };
        body.Controls.Add(dtpBirth);
        Lbl(body, "Gender");
        cmbGender = Combo(body, ["Male", "Female", "Other"]);
        Lbl(body, "Civil Status");
        cmbCivil = Combo(body, ["Single", "Married", "Widowed", "Separated"]);

        Section(body, "📍  Address");
        Lbl(body, "Sitio / Purok");
        cmbSitio = Combo(body, Sitios);
        txtAddress   = Field(body, "Full Address");
        txtHousehold = Field(body, "Household No.");

        Section(body, "📞  Contact & Work");
        txtContact    = Field(body, "Contact No.");
        txtEmail      = Field(body, "Email");
        txtOccupation = Field(body, "Occupation");

        Section(body, "🏷  Tags");
        Lbl(body, "");
        var tagFlow = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, BackColor = Color.White };
        chkVoter  = Tag(tagFlow, "Registered Voter",  Color.FromArgb(37, 99, 235));
        chkSenior = Tag(tagFlow, "Senior Citizen",    Color.FromArgb(5, 150, 105));
        chkPWD    = Tag(tagFlow, "PWD",               Color.FromArgb(217, 119, 6));
        chk4Ps    = Tag(tagFlow, "4Ps Beneficiary",   Color.FromArgb(139, 92, 246));
        body.Controls.Add(tagFlow);

        scroll.Controls.Add(body);

        // ── Footer ────────────────────────────────────────────────────
        var footer = new Panel
        {
            Dock = DockStyle.Bottom, Height = 56,
            BackColor = Color.FromArgb(248, 250, 252)
        };
        footer.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(229, 231, 235));
            e.Graphics.DrawLine(pen, 0, 0, footer.Width, 0);
        };

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
            btnSave.Location    = new Point(footer.Width - 120, 10);
            btnCancel.Location  = new Point(footer.Width - 220, 10);
        };

        Controls.Add(scroll);
        Controls.Add(footer);
        Controls.Add(header);
    }

    private static void Section(TableLayoutPanel t, string text)
    {
        var lbl = new Label
        {
            Text = text, AutoSize = false, Size = new Size(460, 28),
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            BackColor = Color.FromArgb(241, 245, 249),
            Padding = new Padding(0, 4, 0, 0),
            Margin = new Padding(-8, 10, 0, 4)
        };
        t.SetColumnSpan(lbl, 2);
        t.Controls.Add(lbl);
    }

    private static void Lbl(TableLayoutPanel t, string text)
    {
        t.Controls.Add(new Label
        {
            Text = text, AutoSize = true,
            Font = new Font("Segoe UI", 8.5f), ForeColor = Color.FromArgb(71, 85, 105),
            Anchor = AnchorStyles.Left | AnchorStyles.Top,
            Margin = new Padding(0, 8, 0, 0)
        });
    }

    private static TextBox Field(TableLayoutPanel t, string label)
    {
        Lbl(t, label);
        var tb = new TextBox { Width = 310, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        t.Controls.Add(tb);
        return tb;
    }

    private static ComboBox Combo(TableLayoutPanel t, string[] items)
    {
        var c = new ComboBox { Width = 310, DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        c.Items.AddRange(items);
        t.Controls.Add(c);
        return c;
    }

    private static CheckBox Tag(FlowLayoutPanel p, string text, Color color)
    {
        var chk = new CheckBox
        {
            Text = text, AutoSize = true,
            Font = new Font("Segoe UI", 8.5f), ForeColor = color,
            Margin = new Padding(0, 4, 14, 4)
        };
        p.Controls.Add(chk);
        return chk;
    }

    private void Populate(Resident r)
    {
        txtFirst.Text = r.FirstName; txtLast.Text = r.LastName; txtMiddle.Text = r.MiddleName;
        dtpBirth.Value = r.BirthDate == default ? DateTime.Today.AddYears(-20) : r.BirthDate;
        cmbGender.SelectedItem = r.Gender; cmbCivil.SelectedItem = r.CivilStatus;
        cmbSitio.SelectedItem = r.Sitio; txtAddress.Text = r.Address;
        txtHousehold.Text = r.HouseholdNo; txtOccupation.Text = r.Occupation;
        txtContact.Text = r.ContactNumber; txtEmail.Text = r.Email;
        chkVoter.Checked = r.IsVoter; chkSenior.Checked = r.IsSenior;
        chkPWD.Checked = r.IsPWD; chk4Ps.Checked = r.Is4Ps;
    }

    private async Task SaveAsync()
    {
        if (string.IsNullOrWhiteSpace(txtFirst.Text) || string.IsNullOrWhiteSpace(txtLast.Text))
        { MessageBox.Show("First and last name are required.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        var r = new Resident
        {
            Id = _existing?.Id ?? 0,
            FirstName = txtFirst.Text.Trim(), LastName = txtLast.Text.Trim(), MiddleName = txtMiddle.Text.Trim(),
            BirthDate = dtpBirth.Value.Date,
            Gender = cmbGender.SelectedItem?.ToString() ?? "Male",
            CivilStatus = cmbCivil.SelectedItem?.ToString() ?? "Single",
            Sitio = cmbSitio.SelectedItem?.ToString() ?? "",
            Address = txtAddress.Text.Trim(), HouseholdNo = txtHousehold.Text.Trim(),
            Occupation = txtOccupation.Text.Trim(), ContactNumber = txtContact.Text.Trim(),
            Email = txtEmail.Text.Trim(),
            IsVoter = chkVoter.Checked, IsSenior = chkSenior.Checked,
            IsPWD = chkPWD.Checked, Is4Ps = chk4Ps.Checked
        };

        try
        {
            if (_existing is null) await ApiClient.PostAsync<Resident>("api/residents", r);
            else await ApiClient.PutAsync($"api/residents/{r.Id}", r);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) { MessageBox.Show($"Save failed: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
