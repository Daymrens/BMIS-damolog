using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class PaymentCollectDialog : Form
{
    private TextBox txtPayer = null!, txtDesc = null!, txtAmount = null!, txtCollectedBy = null!;
    private ComboBox cmbCategory = null!, cmbMethod = null!, cmbDoc = null!;

    public PaymentCollectDialog()
    {
        Text = "Collect Payment";
        Size = new Size(440, 400);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false; MinimizeBox = false;
        BackColor = Color.White;
        BuildUI();
    }

    private void BuildUI()
    {
        int y = 16, lw = 120, fw = 260, lx = 14, fx = 140;

        void Row(string label, Control ctrl)
        {
            Controls.Add(new Label { Text = label, Location = new Point(lx, y + 3), Size = new Size(lw, 22), Font = new Font("Segoe UI", 9) });
            ctrl.Location = new Point(fx, y); ctrl.Size = new Size(fw, 26);
            ctrl.Font = new Font("Segoe UI", 9);
            Controls.Add(ctrl);
            y += 36;
        }

        txtPayer = new TextBox(); Row("Payer Name *", txtPayer);

        cmbCategory = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        cmbCategory.Items.AddRange(["Clearance Fee", "Business Permit", "Certification Fee", "Blotter Fee", "Other"]);
        cmbCategory.SelectedIndex = 0;
        Row("Category *", cmbCategory);

        cmbDoc = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        cmbDoc.Items.AddRange(["Barangay Clearance", "Certificate of Residency", "Certificate of Indigency",
            "Barangay Business Clearance", "Barangay Blotter Certification", "Other"]);
        cmbDoc.SelectedIndex = 0;
        cmbDoc.SelectedIndexChanged += (_, _) => AutoFillAmount();
        Row("Description *", cmbDoc);

        txtAmount = new TextBox { Text = "50" }; Row("Amount (₱) *", txtAmount);

        cmbMethod = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        cmbMethod.Items.AddRange(["Cash", "GCash", "Maya"]);
        cmbMethod.SelectedIndex = 0;
        Row("Payment Method", cmbMethod);

        txtCollectedBy = new TextBox(); Row("Collected By *", txtCollectedBy);

        var btnOk = new Button
        {
            Text = "Collect Payment", DialogResult = DialogResult.OK,
            Size = new Size(140, 32), Location = new Point(fx, y + 8),
            FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(16, 185, 129),
            ForeColor = Color.White, Font = new Font("Segoe UI", 9, FontStyle.Bold)
        };
        btnOk.FlatAppearance.BorderSize = 0;
        btnOk.Click += async (_, _) => await SubmitAsync();

        var btnCancel = new Button
        {
            Text = "Cancel", DialogResult = DialogResult.Cancel,
            Size = new Size(90, 32), Location = new Point(fx + 150, y + 8),
            FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(229, 231, 235),
            ForeColor = Color.FromArgb(55, 65, 81), Font = new Font("Segoe UI", 9)
        };
        btnCancel.FlatAppearance.BorderSize = 0;

        Controls.AddRange([btnOk, btnCancel]);
        AcceptButton = btnOk;
        CancelButton = btnCancel;
    }

    private void AutoFillAmount()
    {
        var fees = new Dictionary<string, string>
        {
            ["Barangay Clearance"]            = "50",
            ["Certificate of Residency"]      = "50",
            ["Certificate of Indigency"]      = "0",
            ["Barangay Business Clearance"]   = "200",
            ["Barangay Blotter Certification"]= "100",
        };
        var doc = cmbDoc.SelectedItem?.ToString() ?? "";
        if (fees.TryGetValue(doc, out var amt)) txtAmount.Text = amt;
    }

    private async Task SubmitAsync()
    {
        if (string.IsNullOrWhiteSpace(txtPayer.Text)) { MessageBox.Show("Payer name is required."); return; }
        if (!double.TryParse(txtAmount.Text, out var amount)) { MessageBox.Show("Invalid amount."); return; }
        if (string.IsNullOrWhiteSpace(txtCollectedBy.Text)) { MessageBox.Show("Collected by is required."); return; }

        try
        {
            var body = new
            {
                PayerName     = txtPayer.Text.Trim(),
                Category      = cmbCategory.SelectedItem?.ToString() ?? "",
                Description   = cmbDoc.SelectedItem?.ToString() ?? "",
                Amount        = amount,
                PaymentMethod = cmbMethod.SelectedItem?.ToString() ?? "Cash",
                CollectedBy   = txtCollectedBy.Text.Trim(),
            };
            await ApiClient.PostAsync("/api/payments", body);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex) { MessageBox.Show(ex.Message, "Error"); }
    }
}
