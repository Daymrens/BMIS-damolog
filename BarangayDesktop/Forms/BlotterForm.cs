using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class BlotterForm : Form
{
    private readonly Blotter? _existing;
    private TextBox txtComplainant = null!, txtRespondent = null!, txtIncident = null!;
    private TextBox txtDetails = null!, txtLocation = null!;
    private DateTimePicker dtpIncident = null!;
    private ComboBox cmbStatus = null!;

    public BlotterForm(Blotter? existing)
    {
        _existing = existing;
        Text = existing is null ? "File Blotter" : "Update Blotter";
        Size = new Size(520, 560);
        MinimumSize = new Size(480, 500);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.Sizable;
        MaximizeBox = false;
        BackColor = Color.White;
        BuildUI();
        if (existing is not null) Populate(existing);
    }

    private void BuildUI()
    {
        // ── Header ────────────────────────────────────────────────────
        var header = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.FromArgb(185, 28, 28) };
        header.Controls.Add(new Label
        {
            Text = _existing is null ? "📋  File Blotter Case" : "✏  Update Blotter Case",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(16, 14)
        });

        // ── Scrollable body ───────────────────────────────────────────
        var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = Color.White, Padding = new Padding(20, 12, 20, 0) };

        var body = new TableLayoutPanel
        {
            AutoSize = true, ColumnCount = 2, Width = 460, BackColor = Color.White, Padding = new Padding(8, 0, 0, 0)
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 310));

        Section(body, "👤  Parties Involved");
        txtComplainant = Field(body, "Complainant *");
        txtRespondent  = Field(body, "Respondent *");

        Section(body, "📍  Incident Details");
        txtIncident = Field(body, "Incident Type *");
        Lbl(body, "Location");
        txtLocation = new TextBox { Width = 310, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        body.Controls.Add(txtLocation);

        Lbl(body, "Incident Date");
        dtpIncident = new DateTimePicker { Format = DateTimePickerFormat.Short, Width = 310, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        body.Controls.Add(dtpIncident);

        Lbl(body, "Details / Narrative");
        txtDetails = new TextBox { Width = 310, Multiline = true, Height = 80, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0), ScrollBars = ScrollBars.Vertical };
        body.Controls.Add(txtDetails);

        Section(body, "📌  Case Status");
        Lbl(body, "Status");
        cmbStatus = new ComboBox { Width = 310, DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        cmbStatus.Items.AddRange(["Pending", "Settled", "Escalated"]);
        cmbStatus.SelectedIndex = 0;
        body.Controls.Add(cmbStatus);

        scroll.Controls.Add(body);

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
            BackColor = Color.FromArgb(185, 28, 28), ForeColor = Color.White,
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
            ForeColor = Color.FromArgb(185, 28, 28),
            BackColor = Color.FromArgb(255, 241, 242),
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

    private void Populate(Blotter b)
    {
        txtComplainant.Text = b.Complainant;
        txtRespondent.Text  = b.Respondent;
        txtIncident.Text    = b.Incident;
        txtLocation.Text    = b.Location;
        txtDetails.Text     = b.Details;
        dtpIncident.Value   = b.IncidentDate == default ? DateTime.Today : b.IncidentDate;
        cmbStatus.SelectedItem = b.Status;
    }

    private async Task SaveAsync()
    {
        if (string.IsNullOrWhiteSpace(txtComplainant.Text) || string.IsNullOrWhiteSpace(txtRespondent.Text))
        { MessageBox.Show("Complainant and respondent are required.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        var blotter = new Blotter
        {
            Id = _existing?.Id ?? 0,
            CaseNumber = _existing?.CaseNumber ?? "",
            Complainant = txtComplainant.Text.Trim(),
            Respondent  = txtRespondent.Text.Trim(),
            Incident    = txtIncident.Text.Trim(),
            Location    = txtLocation.Text.Trim(),
            Details     = txtDetails.Text.Trim(),
            IncidentDate = dtpIncident.Value,
            Status = cmbStatus.SelectedItem?.ToString() ?? "Pending"
        };

        try
        {
            if (_existing is null) await ApiClient.PostAsync<Blotter>("api/blotters", blotter);
            else await ApiClient.PutAsync($"api/blotters/{blotter.Id}", blotter);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) { MessageBox.Show($"Save failed: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }
}
