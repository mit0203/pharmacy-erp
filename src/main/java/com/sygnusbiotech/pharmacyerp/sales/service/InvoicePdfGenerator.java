package com.sygnusbiotech.pharmacyerp.sales.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Professional Sales Invoice PDF generator for Pharmacy ERP.
 *
 * Manual company details are used directly from this file.
 * Logo is loaded from src/main/resources/logo.png.
 *
 * Removed:
 * - Company GST No
 * - Company DL No
 * - Buyer GST No
 * - Buyer DL No
 * - QR / e-Invoice section
 * - Mumbai jurisdiction line
 * - Bank details section
 * - Declaration section
 * - Authorized signatory section
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
    private static final Color PRIMARY_DARK = new Color(0, 55, 48);
    private static final Color PRIMARY_LIGHT = new Color(232, 245, 233);
    private static final Color HEADER_BG = new Color(0, 77, 64);
    private static final Color ROW_ALT = new Color(245, 250, 248);
    private static final Color BORDER = new Color(189, 189, 189);
    private static final Color LIGHT_BORDER = new Color(224, 224, 224);
    private static final Color TEXT = new Color(33, 33, 33);
    private static final Color TEXT_SEC = new Color(97, 97, 97);
    private static final Color GRAND_BG = new Color(0, 77, 64);
    private static final Color SOFT_BG = new Color(250, 253, 251);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm a");

    // ==================== FONTS ====================
    private static Font f(String name, int size, Color c) {
        return FontFactory.getFont(name, size, c);
    }

    private static Font fB(int size, Color c) {
        return f(FontFactory.HELVETICA_BOLD, size, c);
    }

    private static Font fN(int size, Color c) {
        return f(FontFactory.HELVETICA, size, c);
    }

    /**
     * Data holder for invoice generation.
     */
    public static class InvoiceData {
        // Invoice type
        public String title = "TAX INVOICE";
        public String subtitle = "SALES INVOICE";

        // Company fields are kept for compatibility, but manual constants above are used in PDF.
        public String companyName;
        public String companyAddress;
        public String companyPhone;
        public String companyEmail;
        public String companyGstin;
        public String companyDl;
        public String companyStateCode;
        public String companyState;

        // Bank fields are kept for compatibility, but bank section is removed from PDF.
        public String bankName;
        public String bankAccount;
        public String bankIfsc;
        public String bankBranch;

        // Party
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
            addInvoiceTitle(doc, d);
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
        PdfPTable wrapper = new PdfPTable(1);
        wrapper.setWidthPercentage(100);
        wrapper.setSpacingAfter(6f);

        PdfPCell box = new PdfPCell();
        box.setPadding(0f);
        box.setBorderColor(PRIMARY);
        box.setBorderWidth(1f);
        box.setBackgroundColor(Color.WHITE);

        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{1.05f, 2.95f});

        PdfPCell logoCell = new PdfPCell();
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setPadding(8f);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        logoCell.setBackgroundColor(SOFT_BG);

        try (InputStream logoStream = InvoicePdfGenerator.class
                .getClassLoader()
                .getResourceAsStream("logo.png")) {

            if (logoStream != null) {
                Image img = Image.getInstance(logoStream.readAllBytes());
                img.scaleToFit(95f, 75f);
                img.setAlignment(Element.ALIGN_CENTER);
                logoCell.addElement(img);
            } else {
                Paragraph logoText = new Paragraph(MANUAL_COMPANY_NAME, fB(15, PRIMARY));
                logoText.setAlignment(Element.ALIGN_CENTER);
                logoCell.addElement(logoText);
            }
        } catch (Exception e) {
            Paragraph logoText = new Paragraph(MANUAL_COMPANY_NAME, fB(15, PRIMARY));
            logoText.setAlignment(Element.ALIGN_CENTER);
            logoCell.addElement(logoText);
        }

        header.addCell(logoCell);

        PdfPCell details = new PdfPCell();
        details.setBorder(Rectangle.NO_BORDER);
        details.setPadding(8f);
        details.setHorizontalAlignment(Element.ALIGN_RIGHT);
        details.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph companyName = new Paragraph(MANUAL_COMPANY_NAME, fB(18, PRIMARY_DARK));
        companyName.setAlignment(Element.ALIGN_RIGHT);
        companyName.setSpacingAfter(3f);
        details.addElement(companyName);

        Paragraph address = new Paragraph(MANUAL_COMPANY_ADDRESS, fN(8, TEXT_SEC));
        address.setAlignment(Element.ALIGN_RIGHT);
        address.setLeading(10f);
        details.addElement(address);

        addRightLine(
                details,
                "Phone: " + MANUAL_COMPANY_PHONE + "  |  Email: " + MANUAL_COMPANY_EMAIL,
                fN(8, TEXT_SEC)
        );

        addRightLine(
                details,
                "State: " + MANUAL_COMPANY_STATE + " (" + MANUAL_COMPANY_STATE_CODE + ")",
                fN(8, TEXT_SEC)
        );

        header.addCell(details);
        box.addElement(header);
        wrapper.addCell(box);
        doc.add(wrapper);
    }

    // ==================== TITLE ====================
    private static void addInvoiceTitle(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);

        PdfPCell c = new PdfPCell(new Phrase(safe(d.title), fB(14, Color.WHITE)));
        c.setBackgroundColor(HEADER_BG);
        c.setPadding(8f);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setBorderColor(HEADER_BG);

        t.addCell(c);
        t.setSpacingAfter(8f);
        doc.add(t);
    }

    // ==================== PARTY + INVOICE INFO ====================
    private static void addPartyAndInvoiceInfo(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1f, 1f});
        t.setSpacingAfter(10f);

        PdfPCell party = card(PRIMARY_LIGHT);
        party.addElement(sectionTitle(safe(d.partyLabel)));
        addCardRow(party, "Name", safe(d.partyName));
        addCardRow(party, "Address", safe(d.partyAddress));
        addCardRow(party, "Phone", safe(d.partyPhone));

        if (hasText(d.partyEmail)) {
            addCardRow(party, "Email", safe(d.partyEmail));
        }

        if (hasText(d.partyState) || hasText(d.partyStateCode)) {
            addCardRow(party, "State", stateText(d.partyState, d.partyStateCode));
        }

        t.addCell(party);

        PdfPCell inv = card(Color.WHITE);
        inv.addElement(sectionTitle("Invoice Details"));
        addCardRow(inv, "Invoice No", safe(d.invoiceNumber));

        if (d.subtitle != null
                && d.subtitle.toUpperCase().contains("PURCHASE")
                && hasText(d.supplierInvoiceNumber)) {
            addCardRow(inv, "Supplier Invoice No", safe(d.supplierInvoiceNumber));
        }

        addCardRow(inv, "Invoice Date", fmtDt(d.invoiceDate));
        addCardRow(inv, "Order No", safe(d.orderNumber));
        addCardRow(inv, "Order Date", fmtDt(d.orderDate));
        addCardRow(inv, "Due Date", fmtDt(d.dueDate));
        addCardRow(inv, "LR No", safe(d.lrNumber));
        addCardRow(inv, "Transport", safe(d.transport));
        addCardRow(inv, "Place of Supply", safe(d.placeOfSupply));
        addCardRow(inv, "Reverse Charge", d.reverseCharge ? "Yes" : "No");
        addCardRow(inv, "Payment", safe(d.paymentStatus));

        t.addCell(inv);
        doc.add(t);
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

        PdfPTable t = new PdfPTable(headers.length);
        t.setWidthPercentage(100);
        t.setWidths(widths);
        t.setSpacingAfter(6f);
        t.setHeaderRows(1);

        Font headerFont = fB(7, Color.WHITE);

        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, headerFont));
            c.setBackgroundColor(HEADER_BG);
            c.setBorderColor(HEADER_BG);
            c.setPadding(4f);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            t.addCell(c);
        }

        Font bodyFont = fN(7, TEXT);
        Font boldBodyFont = fB(7, TEXT);

        for (int i = 0; i < d.itemCount; i++) {
            Color bg = (i % 2 == 1) ? ROW_ALT : Color.WHITE;

            addCell(t, String.valueOf(i + 1), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, safe(arrayValue(d.medicineName, i)), bodyFont, Element.ALIGN_LEFT, bg);
            addCell(t, safe(arrayValue(d.pack, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, safe(arrayValue(d.hsn, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, safe(arrayValue(d.batchNumber, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, safe(arrayValue(d.expDate, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, money(arrayValue(d.mrp, i)), bodyFont, Element.ALIGN_RIGHT, bg);
            addCell(t, money(arrayValue(d.rate, i)), bodyFont, Element.ALIGN_RIGHT, bg);
            addCell(t, String.valueOf(intArrayValue(d.qty, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, String.valueOf(intArrayValue(d.freeQty, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, pct(arrayValue(d.discPct, i)), bodyFont, Element.ALIGN_CENTER, bg);
            addCell(t, money(arrayValue(d.taxableValue, i)), bodyFont, Element.ALIGN_RIGHT, bg);

            addCell(
                    t,
                    pct(arrayValue(d.cgstPct, i)) + "\n" + money(arrayValue(d.cgstAmt, i)),
                    bodyFont,
                    Element.ALIGN_CENTER,
                    bg
            );

            addCell(
                    t,
                    pct(arrayValue(d.sgstPct, i)) + "\n" + money(arrayValue(d.sgstAmt, i)),
                    bodyFont,
                    Element.ALIGN_CENTER,
                    bg
            );

            addCell(
                    t,
                    pct(arrayValue(d.igstPct, i)) + "\n" + money(arrayValue(d.igstAmt, i)),
                    bodyFont,
                    Element.ALIGN_CENTER,
                    bg
            );

            addCell(t, money(arrayValue(d.lineTotal, i)), boldBodyFont, Element.ALIGN_RIGHT, bg);
        }

        doc.add(t);
    }

    // ==================== TOTALS ====================
    private static void addTotalsSection(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(45);
        t.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.setWidths(new float[]{2f, 1.5f});
        t.setSpacingAfter(6f);

        addTotalRow(t, "Total Quantity", String.valueOf(d.totalQty));
        addTotalRow(t, "Total Taxable Amount", money(d.totalTaxable));
        addTotalRow(t, "Total CGST", money(d.totalCgst));
        addTotalRow(t, "Total SGST", money(d.totalSgst));

        if (d.totalIgst != null && d.totalIgst.compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(t, "Total IGST", money(d.totalIgst));
        }

        addTotalRow(t, "Round Off", money(d.roundOff));

        PdfPCell gl = new PdfPCell(new Phrase("Grand Total", fB(10, Color.WHITE)));
        gl.setBackgroundColor(GRAND_BG);
        gl.setBorderColor(GRAND_BG);
        gl.setPadding(6f);
        gl.setHorizontalAlignment(Element.ALIGN_LEFT);
        t.addCell(gl);

        PdfPCell gv = new PdfPCell(new Phrase(money(d.grandTotal), fB(10, Color.WHITE)));
        gv.setBackgroundColor(GRAND_BG);
        gv.setBorderColor(GRAND_BG);
        gv.setPadding(6f);
        gv.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(gv);

        addTotalRow(t, "Amount Paid", money(d.amountPaid));
        addTotalRow(t, "Balance Due", money(d.amountDue));

        doc.add(t);
    }

    // ==================== AMOUNT IN WORDS ====================
    private static void addAmountInWords(Document doc, InvoiceData d) throws DocumentException {
        BigDecimal amt = d.grandTotal != null ? d.grandTotal : BigDecimal.ZERO;
        String words = convertToWords(amt.setScale(0, RoundingMode.HALF_UP).longValue());

        Paragraph p = new Paragraph("Amount in Words: " + words + " Rupees Only", fB(8, TEXT));
        p.setSpacingBefore(4f);
        p.setSpacingAfter(10f);
        doc.add(p);
    }

    // ==================== TERMS + FOOTER ====================
    private static void addTermsAndFooter(Document doc, InvoiceData d) throws DocumentException {
        if (hasText(d.termsAndConditions)) {
            Paragraph th = new Paragraph("Terms & Conditions:", fB(8, TEXT));
            th.setSpacingBefore(2f);
            doc.add(th);

            Paragraph tc = new Paragraph(d.termsAndConditions, fN(7, TEXT_SEC));
            tc.setSpacingAfter(4f);
            doc.add(tc);
        }

        Paragraph thanks = new Paragraph("Thank you", fB(8, PRIMARY));
        thanks.setAlignment(Element.ALIGN_CENTER);
        thanks.setSpacingBefore(8f);
        doc.add(thanks);

        Paragraph sys = new Paragraph(
                "This is a computer-generated invoice and does not require a physical signature.",
                fN(7, TEXT_SEC)
        );
        sys.setAlignment(Element.ALIGN_CENTER);
        sys.setSpacingBefore(2f);
        doc.add(sys);
    }

    // ==================== HELPERS ====================
    private static PdfPCell card(Color bg) {
        PdfPCell c = new PdfPCell();
        c.setBorderColor(BORDER);
        c.setPadding(6f);
        c.setBackgroundColor(bg);
        return c;
    }

    private static Paragraph sectionTitle(String value) {
        Paragraph p = new Paragraph(value, fB(10, PRIMARY));
        p.setSpacingAfter(4f);
        return p;
    }

    private static void addCardRow(PdfPCell card, String label, String value) {
        PdfPTable r = new PdfPTable(2);
        r.setWidthPercentage(100);

        try {
            r.setWidths(new float[]{1f, 1.6f});
        } catch (Exception ignored) {
        }

        PdfPCell lc = new PdfPCell(new Phrase(label, fB(7, TEXT_SEC)));
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setPadding(1.5f);

        PdfPCell vc = new PdfPCell(new Phrase(safe(value), fN(7, TEXT)));
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setPadding(1.5f);

        r.addCell(lc);
        r.addCell(vc);
        card.addElement(r);
    }

    private static void addRightLine(PdfPCell cell, String text, Font font) {
        if (!hasText(text)) {
            return;
        }

        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_RIGHT);
        p.setLeading(10f);
        cell.addElement(p);
    }

    private static void addCell(PdfPTable table, String text, Font font, int align, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(safe(text), font));
        c.setPadding(3f);
        c.setBorderColor(LIGHT_BORDER);
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setBackgroundColor(bg);
        table.addCell(c);
    }

    private static void addTotalRow(PdfPTable table, String label, String value) {
        PdfPCell lc = new PdfPCell(new Phrase(label, fN(8, TEXT)));
        lc.setPadding(4f);
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setBackgroundColor(Color.WHITE);
        table.addCell(lc);

        PdfPCell vc = new PdfPCell(new Phrase(value, fN(8, TEXT)));
        vc.setPadding(4f);
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setBackgroundColor(Color.WHITE);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(vc);
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

    static String safe(String v) {
        return v == null || v.isBlank() ? "-" : v.trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    static String money(BigDecimal v) {
        return v == null
                ? "Rs. 0.00"
                : "Rs. " + v.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String pct(BigDecimal v) {
        return v == null ? "0%" : v.stripTrailingZeros().toPlainString() + "%";
    }

    static String fmtDt(LocalDateTime dt) {
        return dt == null ? "-" : dt.format(DATE_FMT);
    }

    static String fmtDateTime(LocalDateTime dt) {
        return dt == null ? "-" : dt.format(DATETIME_FMT);
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
