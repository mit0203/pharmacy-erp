package com.sygnusbiotech.pharmacyerp.sales.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Sales/Purchase GST Tax Invoice PDF generator.
 *
 * Current custom format:
 * - Uses manual company details.
 * - Loads logo from src/main/resources/logo.png.
 * - Removes GSTIN and DL No from company header.
 * - Removes GSTIN and DL No from buyer box.
 * - Removes QR/e-Invoice section.
 * - Removes jurisdiction line.
 * - Removes bank details.
 * - Removes declaration and authorized signatory block.
 */
public final class InvoicePdfGenerator {

    private InvoicePdfGenerator() {
    }

    // ==================== MANUAL COMPANY DETAILS ====================
    private static final String MANUAL_COMPANY_NAME = "Sygnus Biotech";
    private static final String MANUAL_COMPANY_ADDRESS =
            "F/5 To F/9 N.V.Complex, Tavadiya Cross Road, Ahmedabad Abu Road Highway, Sidhpur-384151 (Gujarat) INDIA.";
    private static final String MANUAL_COMPANY_PHONE = "+91 98253 24786";
    private static final String MANUAL_COMPANY_EMAIL = "sygnusbiotech@yahoo.in";
    private static final String MANUAL_COMPANY_STATE = "Gujarat";
    private static final String MANUAL_COMPANY_STATE_CODE = "24";

    // ==================== COLORS ====================
    private static final Color PRIMARY = new Color(0, 77, 64);
    private static final Color PRIMARY_LIGHT = new Color(232, 245, 233);
    private static final Color HEADER_BG = new Color(0, 77, 64);
    private static final Color ROW_ALT = new Color(245, 250, 248);
    private static final Color BORDER = new Color(189, 189, 189);
    private static final Color TEXT = new Color(33, 33, 33);
    private static final Color TEXT_SEC = new Color(97, 97, 97);
    private static final Color GRAND_BG = new Color(0, 77, 64);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm a");

    // ==================== FONTS ====================
    private static Font f(String name, int size, Color color) {
        return FontFactory.getFont(name, size, color);
    }

    private static Font fB(int size, Color color) {
        return f(FontFactory.HELVETICA_BOLD, size, color);
    }

    private static Font fN(int size, Color color) {
        return f(FontFactory.HELVETICA, size, color);
    }

    /**
     * Data holder for invoice generation.
     */
    public static class InvoiceData {
        // Invoice type
        public String title = "TAX INVOICE";
        public String subtitle = "SALES INVOICE";

        // Company - kept for compatibility, but PDF uses manual constants above
        public String companyName;
        public String companyAddress;
        public String companyPhone;
        public String companyEmail;
        public String companyGstin;
        public String companyDl;
        public String companyStateCode;
        public String companyState;

        // Bank - kept for compatibility, but bank section is removed
        public String bankName;
        public String bankAccount;
        public String bankIfsc;
        public String bankBranch;

        // Party / buyer / supplier
        public String partyLabel = "Bill To";
        public String partyName;
        public String partyAddress;
        public String partyPhone;
        public String partyEmail;
        public String partyGstin;
        public String partyDl;
        public String partyState;
        public String partyStateCode;

        // Invoice info
        public String invoiceNumber;
        public String supplierInvoiceNumber;
        public String orderNumber;
        public LocalDateTime invoiceDate;
        public LocalDateTime orderDate;
        public LocalDateTime dueDate;
        public String lrNumber;
        public String transport;
        public String placeOfSupply;
        public boolean reverseCharge;
        public String paymentStatus;

        // Items
        public int itemCount;
        public String[] medicineName;
        public String[] batchNumber;
        public String[] pack;
        public String[] hsn;
        public String[] mfgDate;
        public String[] expDate;
        public BigDecimal[] mrp;
        public BigDecimal[] rate;
        public int[] qty;
        public int[] freeQty;
        public BigDecimal[] discPct;
        public BigDecimal[] taxableValue;
        public BigDecimal[] gstPct;
        public BigDecimal[] cgstPct;
        public BigDecimal[] cgstAmt;
        public BigDecimal[] sgstPct;
        public BigDecimal[] sgstAmt;
        public BigDecimal[] igstPct;
        public BigDecimal[] igstAmt;
        public BigDecimal[] lineTotal;

        // Totals
        public int totalQty;
        public BigDecimal totalTaxable;
        public BigDecimal totalCgst;
        public BigDecimal totalSgst;
        public BigDecimal totalIgst;
        public BigDecimal roundOff;
        public BigDecimal grandTotal;
        public BigDecimal amountPaid;
        public BigDecimal amountDue;

        // Footer
        public String termsAndConditions;
        public String jurisdiction;
        public String footerNote;
    }

    public static byte[] generate(InvoiceData d) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 28, 28, 20, 20);
            PdfWriter.getInstance(doc, out);

            doc.open();

            addHeader(doc);
            addBanner(doc, d);
            addPartyAndInvoiceInfo(doc, d);
            addItemsTable(doc, d);
            addTotalsSection(doc, d);
            addAmountInWords(doc, d);
            addTermsAndFooter(doc, d);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ==================== HEADER ====================
    private static void addHeader(Document doc) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.15f, 2.4f});
        table.setSpacingAfter(6f);

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_LEFT);
        logoCell.setPadding(4f);

        try (InputStream logoStream = InvoicePdfGenerator.class
                .getClassLoader()
                .getResourceAsStream("logo.png")) {

            if (logoStream != null) {
                Image logo = Image.getInstance(logoStream.readAllBytes());
                logo.scaleToFit(110f, 68f);
                logo.setAlignment(Element.ALIGN_LEFT);
                logoCell.addElement(logo);
            } else {
                logoCell.addElement(new Paragraph(MANUAL_COMPANY_NAME, fB(16, PRIMARY)));
            }
        } catch (Exception e) {
            logoCell.addElement(new Paragraph(MANUAL_COMPANY_NAME, fB(16, PRIMARY)));
        }

        table.addCell(logoCell);

        PdfPCell companyCell = new PdfPCell();
        companyCell.setBorder(Rectangle.NO_BORDER);
        companyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        companyCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        companyCell.setPadding(4f);

        Paragraph companyName = new Paragraph(MANUAL_COMPANY_NAME, fB(17, PRIMARY));
        companyName.setAlignment(Element.ALIGN_RIGHT);
        companyCell.addElement(companyName);

        addRightLine(companyCell, MANUAL_COMPANY_ADDRESS, fN(7.5f, TEXT_SEC));
        addRightLine(
                companyCell,
                "Phone: " + MANUAL_COMPANY_PHONE + "  |  Email: " + MANUAL_COMPANY_EMAIL,
                fN(8, TEXT_SEC)
        );
        addRightLine(
                companyCell,
                "State: " + MANUAL_COMPANY_STATE + " (" + MANUAL_COMPANY_STATE_CODE + ")",
                fN(8, TEXT_SEC)
        );

        table.addCell(companyCell);
        doc.add(table);
    }

    // ==================== BANNER ====================
    private static void addBanner(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(safe(d.title), fB(14, Color.WHITE)));
        cell.setBackgroundColor(HEADER_BG);
        cell.setPadding(8f);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBorderColor(HEADER_BG);

        table.addCell(cell);
        table.setSpacingAfter(8f);

        doc.add(table);
    }

    // ==================== PARTY + INVOICE INFO ====================
    private static void addPartyAndInvoiceInfo(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1f, 1f});
        table.setSpacingAfter(10f);

        PdfPCell partyCell = card(PRIMARY_LIGHT);
        partyCell.addElement(new Paragraph(safe(d.partyLabel), fB(10, PRIMARY)));
        addCardRow(partyCell, "Name", safe(d.partyName));
        addCardRow(partyCell, "Address", safe(d.partyAddress));
        addCardRow(partyCell, "Phone", safe(d.partyPhone));

        if (hasText(d.partyEmail)) {
            addCardRow(partyCell, "Email", safe(d.partyEmail));
        }

        if (hasText(d.partyState) || hasText(d.partyStateCode)) {
            addCardRow(partyCell, "State", stateText(d.partyState, d.partyStateCode));
        }

        table.addCell(partyCell);

        PdfPCell invoiceCell = card(Color.WHITE);
        invoiceCell.addElement(new Paragraph("Invoice Details", fB(10, PRIMARY)));
        addCardRow(invoiceCell, "Invoice No", safe(d.invoiceNumber));

        if (d.subtitle != null
                && d.subtitle.toUpperCase().contains("PURCHASE")
                && hasText(d.supplierInvoiceNumber)) {
            addCardRow(invoiceCell, "Supplier Invoice No", safe(d.supplierInvoiceNumber));
        }

        addCardRow(invoiceCell, "Invoice Date", fmtDt(d.invoiceDate));
        addCardRow(invoiceCell, "Order No", safe(d.orderNumber));
        addCardRow(invoiceCell, "Order Date", fmtDt(d.orderDate));
        addCardRow(invoiceCell, "Due Date", fmtDt(d.dueDate));
        addCardRow(invoiceCell, "LR No", safe(d.lrNumber));
        addCardRow(invoiceCell, "Transport", safe(d.transport));
        addCardRow(invoiceCell, "Place of Supply", safe(d.placeOfSupply));
        addCardRow(invoiceCell, "Reverse Charge", d.reverseCharge ? "Yes" : "No");
        addCardRow(invoiceCell, "Payment", safe(d.paymentStatus));

        table.addCell(invoiceCell);
        doc.add(table);
    }

    // ==================== ITEMS TABLE ====================
    private static void addItemsTable(Document doc, InvoiceData d) throws DocumentException {
        String[] headers = {
                "#", "Product", "Pack", "HSN", "Batch", "Exp", "MRP", "Rate",
                "Qty", "Free", "Disc%", "Taxable", "CGST", "SGST", "IGST", "Amount"
        };

        float[] widths = {
                0.45f, 2.35f, 0.65f, 0.75f, 1.0f, 0.8f, 0.8f, 0.8f,
                0.55f, 0.5f, 0.55f, 0.9f, 0.85f, 0.85f, 0.85f, 1.0f
        };

        PdfPTable table = new PdfPTable(headers.length);
        table.setWidthPercentage(100);
        table.setWidths(widths);
        table.setSpacingAfter(6f);
        table.setHeaderRows(1);

        Font headerFont = fB(7, Color.WHITE);

        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setBackgroundColor(HEADER_BG);
            cell.setBorderColor(HEADER_BG);
            cell.setPadding(4f);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        Font bodyFont = fN(7, TEXT);
        Font boldBodyFont = fB(7, TEXT);

        for (int i = 0; i < d.itemCount; i++) {
            Color bg = i % 2 == 1 ? ROW_ALT : Color.WHITE;

            addCell(table, String.valueOf(i + 1), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, safe(arrayValue(d.medicineName, i)), bodyFont, Element.ALIGN_LEFT, bg);
            addCell(table, safe(arrayValue(d.pack, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, safe(arrayValue(d.hsn, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, safe(arrayValue(d.batchNumber, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, safe(arrayValue(d.expDate, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, money(arrayValue(d.mrp, i)), bodyFont, Element.ALIGN_RIGHT, bg);
            addCell(table, money(arrayValue(d.rate, i)), bodyFont, Element.ALIGN_RIGHT, bg);
            addCell(table, String.valueOf(intArrayValue(d.qty, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, String.valueOf(intArrayValue(d.freeQty, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, pct(arrayValue(d.discPct, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(table, money(arrayValue(d.taxableValue, i)), bodyFont, Element.ALIGN_RIGHT, bg);

            String cgst = pct(arrayValue(d.cgstPct, i)) + "\n" + money(arrayValue(d.cgstAmt, i));
            addCell(table, cgst, bodyFont, Element.ALIGN_CENTER, bg);

            String sgst = pct(arrayValue(d.sgstPct, i)) + "\n" + money(arrayValue(d.sgstAmt, i));
            addCell(table, sgst, bodyFont, Element.ALIGN_CENTER, bg);

            String igst = pct(arrayValue(d.igstPct, i)) + "\n" + money(arrayValue(d.igstAmt, i));
            addCell(table, igst, bodyFont, Element.ALIGN_CENTER, bg);

            addCell(table, money(arrayValue(d.lineTotal, i)), boldBodyFont, Element.ALIGN_RIGHT, bg);
        }

        doc.add(table);
    }

    // ==================== TOTALS ====================
    private static void addTotalsSection(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(45);
        table.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.setWidths(new float[]{2f, 1.5f});
        table.setSpacingAfter(6f);

        addTotalRow(table, "Total Quantity", String.valueOf(d.totalQty));
        addTotalRow(table, "Total Taxable Amount", money(d.totalTaxable));
        addTotalRow(table, "Total CGST", money(d.totalCgst));
        addTotalRow(table, "Total SGST", money(d.totalSgst));

        if (d.totalIgst != null && d.totalIgst.compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(table, "Total IGST", money(d.totalIgst));
        }

        addTotalRow(table, "Round Off", money(d.roundOff));

        PdfPCell grandLabel = new PdfPCell(new Phrase("Grand Total", fB(10, Color.WHITE)));
        grandLabel.setBackgroundColor(GRAND_BG);
        grandLabel.setBorderColor(GRAND_BG);
        grandLabel.setPadding(6f);
        grandLabel.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(grandLabel);

        PdfPCell grandValue = new PdfPCell(new Phrase(money(d.grandTotal), fB(10, Color.WHITE)));
        grandValue.setBackgroundColor(GRAND_BG);
        grandValue.setBorderColor(GRAND_BG);
        grandValue.setPadding(6f);
        grandValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(grandValue);

        addTotalRow(table, "Amount Paid", money(d.amountPaid));
        addTotalRow(table, "Balance Due", money(d.amountDue));

        doc.add(table);
    }

    // ==================== AMOUNT IN WORDS ====================
    private static void addAmountInWords(Document doc, InvoiceData d) throws DocumentException {
        BigDecimal amount = d.grandTotal != null ? d.grandTotal : BigDecimal.ZERO;
        String words = convertToWords(amount.setScale(0, RoundingMode.HALF_UP).longValue());

        Paragraph paragraph = new Paragraph(
                "Amount in Words: " + words + " Rupees Only",
                fB(8, TEXT)
        );
        paragraph.setSpacingBefore(4f);
        paragraph.setSpacingAfter(12f);

        doc.add(paragraph);
    }

    // ==================== TERMS + FOOTER ====================
    private static void addTermsAndFooter(Document doc, InvoiceData d) throws DocumentException {
        if (hasText(d.termsAndConditions)) {
            Paragraph heading = new Paragraph("Terms & Conditions:", fB(8, TEXT));
            heading.setSpacingBefore(2f);
            doc.add(heading);

            Paragraph terms = new Paragraph(d.termsAndConditions, fN(7, TEXT_SEC));
            terms.setSpacingAfter(6f);
            doc.add(terms);
        }

        Paragraph footer = new Paragraph(
                hasText(d.footerNote) ? d.footerNote : "Thank you",
                fB(8, PRIMARY)
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(8f);
        doc.add(footer);

        Paragraph systemNote = new Paragraph(
                "This is a computer-generated invoice and does not require a physical signature.",
                fN(7, TEXT_SEC)
        );
        systemNote.setAlignment(Element.ALIGN_CENTER);
        systemNote.setSpacingBefore(2f);
        doc.add(systemNote);
    }

    // ==================== HELPERS ====================
    private static PdfPCell card(Color bg) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER);
        cell.setPadding(6f);
        cell.setBackgroundColor(bg);
        return cell;
    }

    private static void addCardRow(PdfPCell card, String label, String value) {
        PdfPTable row = new PdfPTable(2);
        row.setWidthPercentage(100);

        try {
            row.setWidths(new float[]{1f, 1.6f});
        } catch (Exception ignored) {
        }

        PdfPCell labelCell = new PdfPCell(new Phrase(label, fB(7, TEXT_SEC)));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(1.5f);

        PdfPCell valueCell = new PdfPCell(new Phrase(safe(value), fN(7, TEXT)));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(1.5f);

        row.addCell(labelCell);
        row.addCell(valueCell);

        card.addElement(row);
    }

    private static void addRightLine(PdfPCell cell, String text, Font font) {
        if (!hasText(text)) {
            return;
        }

        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(paragraph);
    }

    private static void addCell(PdfPTable table, String text, Font font, int align, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(safe(text), font));
        cell.setPadding(3f);
        cell.setBorderColor(new Color(224, 224, 224));
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBackgroundColor(bg);
        table.addCell(cell);
    }

    private static void addTotalRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, fN(8, TEXT)));
        labelCell.setPadding(4f);
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setBackgroundColor(Color.WHITE);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, fN(8, TEXT)));
        valueCell.setPadding(4f);
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setBackgroundColor(Color.WHITE);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valueCell);
    }

    private static String stateText(String state, String stateCode) {
        boolean hasState = hasText(state);
        boolean hasCode = hasText(stateCode);

        if (hasState && hasCode) {
            return state.trim() + " (" + stateCode.trim() + ")";
        }

        if (hasState) {
            return state.trim();
        }

        if (hasCode) {
            return stateCode.trim();
        }

        return "-";
    }

    static String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    static String money(BigDecimal value) {
        return value == null
                ? "Rs. 0.00"
                : "Rs. " + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String pct(BigDecimal value) {
        return value == null ? "0%" : value.stripTrailingZeros().toPlainString() + "%";
    }

    static String fmtDt(LocalDateTime dateTime) {
        return dateTime == null ? "-" : dateTime.format(DATE_FMT);
    }

    static String fmtDateTime(LocalDateTime dateTime) {
        return dateTime == null ? "-" : dateTime.format(DATETIME_FMT);
    }

    private static String arrayValue(String[] arr, int index) {
        return arr != null && index >= 0 && index < arr.length ? arr[index] : "-";
    }

    private static BigDecimal arrayValue(BigDecimal[] arr, int index) {
        return arr != null && index >= 0 && index < arr.length ? arr[index] : BigDecimal.ZERO;
    }

    private static int intArrayValue(int[] arr, int index) {
        return arr != null && index >= 0 && index < arr.length ? arr[index] : 0;
    }

    // ==================== NUMBER TO WORDS ====================
    private static final String[] ONES = {
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
            "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    };

    private static final String[] TENS = {
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
            "Seventy", "Eighty", "Ninety"
    };

    static String convertToWords(long n) {
        if (n == 0) {
            return "Zero";
        }

        if (n < 0) {
            return "Minus " + convertToWords(-n);
        }

        StringBuilder result = new StringBuilder();

        if (n / 10000000 > 0) {
            result.append(convertToWords(n / 10000000)).append(" Crore ");
            n %= 10000000;
        }

        if (n / 100000 > 0) {
            result.append(convertToWords(n / 100000)).append(" Lakh ");
            n %= 100000;
        }

        if (n / 1000 > 0) {
            result.append(convertToWords(n / 1000)).append(" Thousand ");
            n %= 1000;
        }

        if (n / 100 > 0) {
            result.append(convertToWords(n / 100)).append(" Hundred ");
            n %= 100;
        }

        if (n > 0) {
            if (result.length() > 0) {
                result.append("and ");
            }

            if (n < 20) {
                result.append(ONES[(int) n]);
            } else {
                result.append(TENS[(int) (n / 10)]);
                if (n % 10 > 0) {
                    result.append(" ").append(ONES[(int) (n % 10)]);
                }
            }
        }

        return result.toString().trim();
    }
}
