using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class QueueAddDialog : Form
{
    private TextBox txtName = null!, txtContact = null!, txtPurpose = null!;
    private ComboBox cmbDoc = null!, cmbType = null!;

    public QueueAddDialog()
    {
        Text = "New Walk-in Request";
        Size = new Size(420, 340);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        BackColor = Color.White;
        BuildUI();
    }

    private void BuildUI()
    {
        int y = 16, lw = 110, fw = 260, lx = 14, fx = 130;

        void Row(string label, Control ctrl)
        {
            Controls.Add(new Label { Text = label, Location = new Point(lx, y + 3), Size = new Size(lw, 22), Font = new Font("Segoe UI", 9) });
            ctrl.Location = new Point(fx, y); ctrl.Size = new Size(fw, 26);
            ctrl.Font = new Font("Segoe UI", 9);
            Controls.Add(ctrl);
            y += 36;
        }

        txtName    = new TextBox(); Row("Full Name *", txtName);
        txtContact = new TextBox(); Row("Contact #",   txtContact);

        cmbDoc = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        cmbDoc.Items.AddRange(["Barangay Clearance", "Certificate of Residency", "Certificate of Indigency",
            "Barangay Business Clearance", "Barangay Blotter Certification", "Other"]);
        cmbDoc.SelectedIndex = 0;
        Row("Document Type *", cmbDoc);

        txtPurpose = new TextBox(); Row("Purpose", txtPurpose);

        cmbType = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        cmbType.Items.AddRange(["Walk-in", "Online"]);
        cmbType.SelectedIndex = 0;
        Row("Request Type", cmbType);

        var btnOk = new Button
        {
            Text = "Add to Queue", DialogResult = DialogResult.OK,
            Size = new Size(130, 32), Location = new Point(fx, y + 8),
            FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(16, 185, 129),
            ForeColor = Color.White, Font = new Font("Segoe UI", 9, FontStyle.Bold)
        };
        btnOk.FlatAppearance.BorderSize = 0;
        btnOk.Click += async (_, _) => await SubmitAsync();

        var btnCancel = new Button
        {
            Text = "Cancel", DialogResult = DialogResult.Cancel,
            Size = new Size(90, 32), Location = new Point(fx + 140, y + 8),
            FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(229, 231, 235),
            ForeColor = Color.FromArgb(55, 65, 81), Font = new Font("Segoe UI", 9)
        };
        btnCancel.FlatAppearance.BorderSize = 0;

        Controls.AddRange([btnOk, btnCancel]);
        AcceptButton = btnOk;
        CancelButton = btnCancel;
    }

    private async Task SubmitAsync()
    {
        if (string.IsNullOrWhiteSpace(txtName.Text)) { MessageBox.Show("Full name is required."); return; }
        try
        {
            var body = new
            {
                RequesterName = txtName.Text.Trim(),
                ContactNumber = txtContact.Text.Trim(),
                DocumentType  = cmbDoc.SelectedItem?.ToString() ?? "",
                Purpose       = txtPurpose.Text.Trim(),
                RequestType   = cmbType.SelectedItem?.ToString() ?? "Walk-in",
            };
            await ApiClient.PostAsync("/api/queue", body);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Error"); }
    }
}
