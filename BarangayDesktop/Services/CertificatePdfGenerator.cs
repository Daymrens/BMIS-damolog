using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestDocument = QuestPDF.Fluent.Document;

namespace BarangayDesktop.Services;

public record CertificateData(
    string DocumentType,
    string ResidentFullName,
    string Address,
    string Purpose,
    string IssuedBy,
    string ControlNumber,
    DateTime IssuedAt,
    // Blotter-specific
    string? CaseNumber = null,
    string? Complainant = null,
    string? Respondent = null,
    string? Incident = null,
    string? Details = null,
    DateTime? IncidentDate = null
);

public static class CertificatePdfGenerator
{
    static CertificatePdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(CertificateData data)
    {
        return QuestDocument.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(11));

                page.Header().Element(c => BuildHeader(c, data));
                page.Content().Element(c => BuildContent(c, data));
                page.Footer().Element(BuildFooter);
            });
        }).GeneratePdf();
    }

    private static void BuildHeader(IContainer container, CertificateData data)
    {
        container.Column(col =>
        {
            // Logo + text row
            col.Item().AlignCenter().Row(row =>
            {
                // Logo
                var logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "logo.png");
                if (File.Exists(logoPath))
                {
                    row.ConstantItem(60).Height(60).Image(logoPath, ImageScaling.FitArea);
                    row.ConstantItem(12); // spacer
                }

                row.RelativeItem().AlignCenter().Column(txt =>
                {
                    txt.Item().AlignCenter().Text("Republic of the Philippines").FontSize(9).Italic();
                    txt.Item().AlignCenter().Text("Province of Cebu  ·  Municipality of Sogod").FontSize(9).Italic();
                    txt.Item().AlignCenter().Text("BARANGAY DAMOLOG").Bold().FontSize(14);
                });
            });

            col.Item().PaddingVertical(4).LineHorizontal(1.5f).LineColor(Colors.Blue.Medium);
            col.Item().PaddingTop(8).AlignCenter().Text(data.DocumentType.ToUpper()).Bold().FontSize(16).FontColor(Colors.Blue.Darken3);
            col.Item().PaddingBottom(12).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten1);
        });
    }

    private static void BuildContent(IContainer container, CertificateData data)
    {
        container.PaddingTop(10).Column(col =>
        {
            // Control number & date
            col.Item().Row(row =>
            {
                row.RelativeItem().Text($"Control No: {data.ControlNumber}").FontSize(9).FontColor(Colors.Grey.Darken2);
                row.RelativeItem().AlignRight().Text($"Date: {data.IssuedAt:MMMM dd, yyyy}").FontSize(9).FontColor(Colors.Grey.Darken2);
            });

            col.Item().PaddingTop(20);

            // Greeting
            col.Item().Text("TO WHOM IT MAY CONCERN:").Bold().FontSize(11);
            col.Item().PaddingTop(14);

            // Body text based on document type
            var body = BuildBodyText(data);
            col.Item().Text(body).FontSize(11).LineHeight(1.6f);

            col.Item().PaddingTop(16);

            // Purpose line
            col.Item().Text(txt =>
            {
                txt.Span("This certification is issued upon the request of the above-named person for the purpose of ").FontSize(11);
                txt.Span(data.Purpose).Bold().FontSize(11);
                txt.Span(" and for whatever legal purpose it may serve.").FontSize(11);
            });

            // Blotter-specific details table
            if (data.DocumentType == "Barangay Blotter Certification" && data.CaseNumber != null)
            {
                col.Item().PaddingTop(16).Table(table =>
                {
                    table.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(3); });
                    void Row(string label, string value)
                    {
                        table.Cell().Padding(4).Background(Colors.Grey.Lighten4).Text(label).Bold().FontSize(10);
                        table.Cell().Padding(4).Text(value).FontSize(10);
                    }
                    Row("Case Number:", data.CaseNumber ?? "");
                    Row("Complainant:", data.Complainant ?? "");
                    Row("Respondent:", data.Respondent ?? "");
                    Row("Incident:", data.Incident ?? "");
                    Row("Incident Date:", data.IncidentDate?.ToString("MMMM dd, yyyy") ?? "");
                    Row("Details:", data.Details ?? "");
                });
            }

            col.Item().PaddingTop(40);

            // Signature block
            col.Item().AlignRight().Column(sig =>
            {
                sig.Item().AlignCenter().Text("Respectfully yours,").FontSize(10);
                sig.Item().PaddingTop(30).AlignCenter().Text(data.IssuedBy).Bold().FontSize(12);
                sig.Item().AlignCenter().LineHorizontal(0.5f).LineColor(Colors.Black);
                sig.Item().AlignCenter().Text("Punong Barangay").FontSize(10).Italic();
                sig.Item().AlignCenter().Text("Barangay Damolog").FontSize(10).Italic();
                sig.Item().AlignCenter().Text("Municipality of Sogod, Cebu").FontSize(10).Italic();
            });

            col.Item().PaddingTop(30);

            // OR stamp area
            col.Item().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(8).Row(row =>
            {
                row.RelativeItem().Text("O.R. No.: ___________________").FontSize(9);
                row.RelativeItem().Text("Amount Paid: ₱ _______________").FontSize(9);
                row.RelativeItem().Text("Date Paid: __________________").FontSize(9);
            });
        });
    }

    private static string BuildBodyText(CertificateData data)
    {
        var name = data.ResidentFullName.ToUpper();
        var address = data.Address;

        return data.DocumentType switch
        {
            "Barangay Clearance" =>
                $"This is to certify that {name}, of legal age, a resident of {address}, " +
                $"is personally known to this office and is a person of good moral character and has no " +
                $"derogatory record on file in this barangay as of this date.",

            "Certificate of Residency" =>
                $"This is to certify that {name} is a bonafide resident of {address}, " +
                $"and has been residing in this barangay for a considerable period of time. " +
                $"This certification is given to attest to the fact of residency of the above-named person.",

            "Certificate of Indigency" =>
                $"This is to certify that {name}, a resident of {address}, " +
                $"belongs to an indigent family in this barangay. The family does not have sufficient income " +
                $"to meet their basic needs and is hereby certified as an indigent member of this community.",

            "Barangay Business Clearance" =>
                $"This is to certify that {name}, a resident of {address}, " +
                $"has been granted clearance by this barangay to operate a business establishment within " +
                $"the jurisdiction of Barangay Damolog. The applicant has no pending case or complaint " +
                $"filed in this barangay as of this date.",

            "Barangay Blotter Certification" =>
                $"This is to certify that the incident described below has been duly recorded in the " +
                $"Barangay Blotter Book of Barangay Damolog, Municipality of Sogod, Cebu. The parties involved are known residents " +
                $"of this barangay and the matter has been officially documented.",

            _ =>
                $"This is to certify that {name}, a resident of {address}, " +
                $"is known to this office and this certification is issued as requested."
        };
    }

    private static void BuildFooter(IContainer container)
    {
        container.BorderTop(0.5f).BorderColor(Colors.Grey.Lighten1).PaddingTop(6).Row(row =>
        {
            row.RelativeItem().Text("Barangay Damolog, Municipality of Sogod, Cebu — Official Document").FontSize(8).FontColor(Colors.Grey.Medium).Italic();
            row.RelativeItem().AlignRight().Text(txt =>
            {
                txt.Span("Page ").FontSize(8).FontColor(Colors.Grey.Medium);
                txt.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
                txt.Span(" of ").FontSize(8).FontColor(Colors.Grey.Medium);
                txt.TotalPages().FontSize(8).FontColor(Colors.Grey.Medium);
            });
        });
    }
}
