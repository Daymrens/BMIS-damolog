using System.Drawing;
using System.Windows.Forms;
using BarangayDesktop.Services;

namespace BarangayDesktop;

public class IssueDocumentDialog : Form
{
    private readonly Resident _resident;
    private readonly string _documentType;
    private readonly List<Official> _officials;

    private TextBox txtPurpose = null!;
    private ComboBox cmbIssuedBy = null!;

    // Blotter-specific fields
    private TextBox? txtCaseNumber, txtComplainant, txtRespondent, txtIncident, txtDetails;
    private DateTimePicker? dtpIncidentDate;
    private Blotter? _blotter;

    public Document? IssuedDocument { get; private set; }

    public IssueDocumentDialog(Resident resident, string documentType, List<Official> officials, Blotter? blotter = null)
    {
        _resident     = resident;
        _documentType = documentType;
        _officials    = officials;
        _blotter      = blotter;

        Text = $"Issue — {documentType}";
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        BackColor = Color.White;
        Size = documentType == "Barangay Blotter Certification" ? new Size(520, 620) : new Size(500, 420);
        BuildUI();
    }

    private void BuildUI()
    {
        // ── Header ────────────────────────────────────────────────────
        var header = new Panel { Dock = DockStyle.Top, Height = 52, BackColor = Color.FromArgb(15, 48, 96) };
        header.Controls.Add(new Label
        {
            Text = $"📄  {_documentType}",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.White, AutoSize = true, Location = new Point(16, 14)
        });

        // ── Scrollable body ───────────────────────────────────────────
        var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = Color.White, Padding = new Padding(20, 12, 20, 0) };

        var body = new TableLayoutPanel
        {
            AutoSize = true, ColumnCount = 2, Width = 450, BackColor = Color.White
        };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 300));

        // ── Resident info (read-only) ─────────────────────────────────
        Section(body, "👤  Resident Information");

        Lbl(body, "Full Name");
        body.Controls.Add(ReadOnly($"{_resident.LastName}, {_resident.FirstName} {_resident.MiddleName}".Trim()));

        Lbl(body, "Address");
        body.Controls.Add(ReadOnly(_resident.Address));

        Lbl(body, "Date Issued");
        body.Controls.Add(new Label
        {
            Text = DateTime.Now.ToString("MMMM dd, yyyy"),
            AutoSize = true, Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            Margin = new Padding(0, 6, 0, 0)
        });

        // ── Blotter-specific fields ───────────────────────────────────
        if (_documentType == "Barangay Blotter Certification")
        {
            Section(body, "📋  Blotter Details");

            Lbl(body, "Case Number");
            txtCaseNumber = Input(body, _blotter?.CaseNumber ?? "");

            Lbl(body, "Complainant");
            txtComplainant = Input(body, _blotter?.Complainant ?? "");

            Lbl(body, "Respondent");
            txtRespondent = Input(body, _blotter?.Respondent ?? "");

            Lbl(body, "Incident");
            txtIncident = Input(body, _blotter?.Incident ?? "");

            Lbl(body, "Details");
            txtDetails = new TextBox
            {
                Text = _blotter?.Details ?? "", Width = 300, Multiline = true, Height = 60,
                Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0), ScrollBars = ScrollBars.Vertical
            };
            body.Controls.Add(txtDetails);

            Lbl(body, "Incident Date");
            dtpIncidentDate = new DateTimePicker { Format = DateTimePickerFormat.Short, Width = 300, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
            if (_blotter?.IncidentDate != default) dtpIncidentDate.Value = _blotter!.IncidentDate;
            body.Controls.Add(dtpIncidentDate);
        }

        // ── Issuance details ─────────────────────────────────────────
        Section(body, "📝  Issuance Details");

        Lbl(body, "Purpose *");
        txtPurpose = new TextBox
        {
            Width = 300, Font = new Font("Segoe UI", 9),
            Margin = new Padding(0, 4, 0, 0),
            PlaceholderText = "e.g. Employment, School Enrollment…"
        };
        body.Controls.Add(txtPurpose);

        Lbl(body, "Issued By *");
        cmbIssuedBy = new ComboBox { Width = 300, DropDownStyle = ComboBoxStyle.DropDownList, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        foreach (var o in _officials.Where(o => o.IsActive))
            cmbIssuedBy.Items.Add(o.Name);
        if (cmbIssuedBy.Items.Count > 0) cmbIssuedBy.SelectedIndex = 0;
        body.Controls.Add(cmbIssuedBy);

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

        var btnIssue = new Button
        {
            Text = "📄  Issue & Generate PDF", Size = new Size(180, 36), FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(15, 48, 96), ForeColor = Color.White,
            Font = new Font("Segoe UI", 9, FontStyle.Bold), Cursor = Cursors.Hand,
            Anchor = AnchorStyles.Right | AnchorStyles.Top
        };
        btnIssue.FlatAppearance.BorderSize = 0;
        btnIssue.Click += async (_, _) => await IssueAndGenerateAsync();

        footer.Controls.AddRange([btnCancel, btnIssue]);
        footer.Resize += (_, _) =>
        {
            btnIssue.Location   = new Point(footer.Width - 190, 10);
            btnCancel.Location  = new Point(footer.Width - 290, 10);
        };

        Controls.Add(scroll);
        Controls.Add(footer);
        Controls.Add(header);
    }

    private static void Section(TableLayoutPanel t, string text)
    {
        var lbl = new Label
        {
            Text = text, AutoSize = false, Size = new Size(450, 28),
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = Color.FromArgb(15, 48, 96),
            BackColor = Color.FromArgb(241, 245, 249),
            Padding = new Padding(4, 4, 0, 0),
            Margin = new Padding(0, 10, 0, 4)
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

    private static TextBox ReadOnly(string text) => new()
    {
        Text = text, Width = 300, ReadOnly = true,
        Font = new Font("Segoe UI", 9, FontStyle.Bold),
        BackColor = Color.FromArgb(248, 250, 252),
        ForeColor = Color.FromArgb(30, 58, 95),
        BorderStyle = BorderStyle.FixedSingle,
        Margin = new Padding(0, 4, 0, 0)
    };

    private static TextBox Input(TableLayoutPanel t, string value)
    {
        var tb = new TextBox { Text = value, Width = 300, Font = new Font("Segoe UI", 9), Margin = new Padding(0, 4, 0, 0) };
        t.Controls.Add(tb);
        return tb;
    }

    private async Task IssueAndGenerateAsync()
    {
        if (string.IsNullOrWhiteSpace(txtPurpose.Text))
        { MessageBox.Show("Please enter the purpose.", "Required", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        var doc = new Document
        {
            ResidentId   = _resident.Id,
            DocumentType = _documentType,
            Purpose      = txtPurpose.Text.Trim(),
            IssuedBy     = cmbIssuedBy.SelectedItem?.ToString() ?? ""
        };

        try
        {
            var issued = await ApiClient.PostAsync<Document>("api/documents", doc);
            IssuedDocument = issued;

            var certData = new CertificateData(
                DocumentType: _documentType,
                ResidentFullName: $"{_resident.FirstName} {_resident.MiddleName} {_resident.LastName}".Trim(),
                Address: _resident.Address,
                Purpose: txtPurpose.Text.Trim(),
                IssuedBy: cmbIssuedBy.SelectedItem?.ToString() ?? "",
                ControlNumber: issued?.ControlNumber ?? $"BRY-{DateTime.Now:yyyyMMdd}-DRAFT",
                IssuedAt: DateTime.Now,
                CaseNumber: txtCaseNumber?.Text,
                Complainant: txtComplainant?.Text,
                Respondent: txtRespondent?.Text,
                Incident: txtIncident?.Text,
                Details: txtDetails?.Text,
                IncidentDate: dtpIncidentDate?.Value
            );

            var pdfBytes = CertificatePdfGenerator.Generate(certData);
            var fileName = $"{_documentType.Replace(" ", "_")}_{_resident.LastName}_{DateTime.Now:yyyyMMddHHmm}.pdf";
            var tempPath = Path.Combine(Path.GetTempPath(), fileName);
            await File.WriteAllBytesAsync(tempPath, pdfBytes);

            using var sfd = new SaveFileDialog
            {
                Title = "Save PDF Certificate", FileName = fileName, Filter = "PDF Files|*.pdf"
            };
            if (sfd.ShowDialog() == DialogResult.OK)
                await File.WriteAllBytesAsync(sfd.FileName, pdfBytes);

            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(tempPath) { UseShellExecute = true });

            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error: {ex.Message}", "Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
