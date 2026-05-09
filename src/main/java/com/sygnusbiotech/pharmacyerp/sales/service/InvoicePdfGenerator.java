package com.sygnusbiotech.pharmacyerp.sales.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.sygnusbiotech.pharmacyerp.settings.model.AppSettings;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Reusable professional GST Tax Invoice PDF generator for Pharmacy ERP.
 * Produces A4, print-ready invoices with full GST compliance fields.
 */
public final class InvoicePdfGenerator {

    private InvoicePdfGenerator() {}

    // -- Colors --
    private static final Color PRIMARY = new Color(0, 77, 64);
    private static final Color PRIMARY_LIGHT = new Color(232, 245, 233);
    private static final Color HEADER_BG = new Color(0, 77, 64);
    private static final Color ROW_ALT = new Color(245, 250, 248);
    private static final Color BORDER = new Color(189, 189, 189);
    private static final Color TEXT = new Color(33, 33, 33);
    private static final Color TEXT_SEC = new Color(97, 97, 97);
    private static final Color TOTAL_BG = new Color(232, 245, 233);
    private static final Color GRAND_BG = new Color(0, 77, 64);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm a");

    private static final String LOGO_PATH = System.getProperty(
            "app.logo.path",
            System.getenv().getOrDefault("APP_LOGO_PATH", "frontend/public/logo.png")
    );

    // -- Fonts --
    private static Font f(String name, int size, Color c) { return FontFactory.getFont(name, size, c); }
    private static Font fB(int size, Color c) { return f(FontFactory.HELVETICA_BOLD, size, c); }
    private static Font fN(int size, Color c) { return f(FontFactory.HELVETICA, size, c); }

    /**
     * Data holder for invoice generation.
     */
    public static class InvoiceData {
        // Invoice type
        public String title = "TAX INVOICE";
        public String subtitle = "SALES INVOICE";
        // Company
        public String companyName, companyAddress, companyPhone, companyEmail;
        public String companyGstin, companyDl, companyStateCode, companyState;
        public String bankName, bankAccount, bankIfsc, bankBranch;
        // Party (buyer/supplier)
        public String partyLabel = "Bill To";
        public String partyName, partyAddress, partyPhone, partyEmail;
        public String partyGstin, partyDl, partyState, partyStateCode;
        // Invoice info
        public String invoiceNumber, supplierInvoiceNumber, orderNumber;
        public LocalDateTime invoiceDate, orderDate, dueDate;
        public String lrNumber, transport, placeOfSupply;
        public boolean reverseCharge;
        public String paymentStatus;
        // Items - arrays for table
        public int itemCount;
        public String[] medicineName, batchNumber, pack, hsn, mfgDate, expDate;
        public BigDecimal[] mrp, rate;
        public int[] qty, freeQty;
        public BigDecimal[] discPct, taxableValue, gstPct;
        public BigDecimal[] cgstPct, cgstAmt, sgstPct, sgstAmt, igstPct, igstAmt, lineTotal;
        // Totals
        public int totalQty;
        public BigDecimal totalTaxable, totalCgst, totalSgst, totalIgst;
        public BigDecimal roundOff, grandTotal, amountPaid, amountDue;
        // Footer
        public String termsAndConditions, jurisdiction, footerNote;
    }

    public static byte[] generate(InvoiceData d) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 28, 28, 20, 20);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addHeader(doc, d);
            addBanner(doc, d);
            addPartyAndInvoiceInfo(doc, d);
            addItemsTable(doc, d);
            addTotalsSection(doc, d);
            addAmountInWords(doc, d);
            addBankAndSignature(doc, d);
            addTermsAndFooter(doc, d);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ==================== HEADER ====================
    private static void addHeader(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1f, 2.5f});
        t.setSpacingAfter(4f);

        // Logo cell
        PdfPCell logo = new PdfPCell();
        logo.setBorder(Rectangle.NO_BORDER);
        logo.setVerticalAlignment(Element.ALIGN_MIDDLE);
        try {
            Path p = Paths.get(LOGO_PATH);
            if (Files.exists(p)) {
                Image img = Image.getInstance(p.toAbsolutePath().toString());
                img.scaleToFit(80f, 80f);
                logo.addElement(img);
            } else {
                logo.addElement(new Paragraph(safe(d.companyName), fB(16, PRIMARY)));
            }
        } catch (Exception e) {
            logo.addElement(new Paragraph(safe(d.companyName), fB(16, PRIMARY)));
        }
        t.addCell(logo);

        // Company details cell
        PdfPCell comp = new PdfPCell();
        comp.setBorder(Rectangle.NO_BORDER);
        comp.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph cn = new Paragraph(safe(d.companyName), fB(16, PRIMARY));
        cn.setAlignment(Element.ALIGN_RIGHT);
        comp.addElement(cn);
        addRightLine(comp, safe(d.companyAddress), fN(8, TEXT_SEC));
        addRightLine(comp, "Phone: " + safe(d.companyPhone) + "  |  Email: " + safe(d.companyEmail), fN(8, TEXT_SEC));
        addRightLine(comp, "GSTIN: " + safe(d.companyGstin) + "  |  DL No: " + safe(d.companyDl), fN(8, TEXT));
        addRightLine(comp, "State: " + safe(d.companyState) + " (" + safe(d.companyStateCode) + ")", fN(8, TEXT_SEC));
        t.addCell(comp);
        doc.add(t);
    }

    // ==================== BANNER ====================
    private static void addBanner(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        PdfPCell c = new PdfPCell(new Phrase(d.title, fB(14, Color.WHITE)));
        c.setBackgroundColor(HEADER_BG);
        c.setPadding(8f);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
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

        // Party card
        PdfPCell party = card(PRIMARY_LIGHT);
        party.addElement(new Paragraph(d.partyLabel, fB(10, PRIMARY)));
        addCardRow(party, "Name", safe(d.partyName));
        addCardRow(party, "Address", safe(d.partyAddress));
        addCardRow(party, "Phone", safe(d.partyPhone));
        addCardRow(party, "GSTIN", safe(d.partyGstin));
        addCardRow(party, "DL No", safe(d.partyDl));
        addCardRow(party, "State", safe(d.partyState) + " (" + safe(d.partyStateCode) + ")");
        t.addCell(party);

        // Invoice card
        PdfPCell inv = card(Color.WHITE);
        inv.addElement(new Paragraph("Invoice Details", fB(10, PRIMARY)));
        addCardRow(inv, "Invoice No", safe(d.invoiceNumber));
        if (d.subtitle != null && d.subtitle.toUpperCase().contains("PURCHASE") && d.supplierInvoiceNumber != null && !d.supplierInvoiceNumber.isBlank()) {
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
        // 16 columns
        String[] headers = {"#", "Product", "Pack", "HSN", "Batch", "Exp", "MRP", "Rate", "Qty", "Free",
                "Disc%", "Taxable", "CGST", "SGST", "IGST", "Amount"};
        float[] widths = {0.45f, 2.35f, 0.65f, 0.75f, 1.0f, 0.8f, 0.8f, 0.8f, 0.55f, 0.5f,
                0.55f, 0.9f, 0.85f, 0.85f, 0.85f, 1.0f};

        PdfPTable t = new PdfPTable(headers.length);
        t.setWidthPercentage(100);
        t.setWidths(widths);
        t.setSpacingAfter(6f);
        t.setHeaderRows(1);

        Font hf = fB(7, Color.WHITE);
        for (String h : headers) {
            PdfPCell c = new PdfPCell(new Phrase(h, hf));
            c.setBackgroundColor(HEADER_BG);
            c.setBorderColor(HEADER_BG);
            c.setPadding(4f);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            t.addCell(c);
        }

        Font bf = fN(7, TEXT);
        Font bfb = fB(7, TEXT);
        for (int i = 0; i < d.itemCount; i++) {
            Color bg = (i % 2 == 1) ? ROW_ALT : Color.WHITE;
            addCell(t, String.valueOf(i + 1), bf, Element.ALIGN_CENTER, bg);
            addCell(t, safe(d.medicineName[i]), bf, Element.ALIGN_LEFT, bg);
            addCell(t, safe(d.pack[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, safe(d.hsn[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, safe(d.batchNumber[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, safe(d.expDate[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, money(d.mrp[i]), bf, Element.ALIGN_RIGHT, bg);
            addCell(t, money(d.rate[i]), bf, Element.ALIGN_RIGHT, bg);
            addCell(t, String.valueOf(d.qty[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, String.valueOf(d.freeQty[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, pct(d.discPct[i]), bf, Element.ALIGN_CENTER, bg);
            addCell(t, money(d.taxableValue[i]), bf, Element.ALIGN_RIGHT, bg);
            // CGST combined
            String cgst = pct(d.cgstPct[i]) + "\n" + money(d.cgstAmt[i]);
            addCell(t, cgst, bf, Element.ALIGN_CENTER, bg);
            String sgst = pct(d.sgstPct[i]) + "\n" + money(d.sgstAmt[i]);
            addCell(t, sgst, bf, Element.ALIGN_CENTER, bg);
            String igst = pct(d.igstPct[i]) + "\n" + money(d.igstAmt[i]);
            addCell(t, igst, bf, Element.ALIGN_CENTER, bg);
            addCell(t, money(d.lineTotal[i]), bfb, Element.ALIGN_RIGHT, bg);
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

        addTotalRow(t, "Total Quantity", String.valueOf(d.totalQty), false);
        addTotalRow(t, "Total Taxable Amount", money(d.totalTaxable), false);
        addTotalRow(t, "Total CGST", money(d.totalCgst), false);
        addTotalRow(t, "Total SGST", money(d.totalSgst), false);
        if (d.totalIgst != null && d.totalIgst.compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(t, "Total IGST", money(d.totalIgst), false);
        }
        addTotalRow(t, "Round Off", money(d.roundOff), false);

        // Grand total highlight
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

        addTotalRow(t, "Amount Paid", money(d.amountPaid), false);
        addTotalRow(t, "Balance Due", money(d.amountDue), false);

        doc.add(t);
    }

    // ==================== AMOUNT IN WORDS ====================
    private static void addAmountInWords(Document doc, InvoiceData d) throws DocumentException {
        BigDecimal amt = d.grandTotal != null ? d.grandTotal : BigDecimal.ZERO;
        String words = convertToWords(amt.setScale(0, RoundingMode.HALF_UP).longValue());
        Paragraph p = new Paragraph("Amount in Words: " + words + " Rupees Only", fB(8, TEXT));
        p.setSpacingAfter(6f);
        doc.add(p);
    }

    // ==================== BANK + SIGNATURE ====================
    private static void addBankAndSignature(Document doc, InvoiceData d) throws DocumentException {
        PdfPTable t = new PdfPTable(2);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{1.2f, 1f});
        t.setSpacingAfter(6f);

        // Bank details
        PdfPCell bank = card(PRIMARY_LIGHT);
        bank.addElement(new Paragraph("Bank Details", fB(9, PRIMARY)));
        addCardRow(bank, "Bank", safe(d.bankName));
        addCardRow(bank, "A/C No", safe(d.bankAccount));
        addCardRow(bank, "IFSC", safe(d.bankIfsc));
        addCardRow(bank, "Branch", safe(d.bankBranch));
        t.addCell(bank);

        // Authorized signatory
        PdfPCell sig = new PdfPCell();
        sig.setBorderColor(BORDER);
        sig.setPadding(8f);
        sig.setMinimumHeight(60f);
        Paragraph sf = new Paragraph("For " + safe(d.companyName), fB(9, TEXT));
        sf.setAlignment(Element.ALIGN_RIGHT);
        sig.addElement(sf);
        sig.addElement(new Paragraph("\n\n", fN(8, TEXT)));
        Paragraph as = new Paragraph("Authorized Signatory", fN(8, TEXT_SEC));
        as.setAlignment(Element.ALIGN_RIGHT);
        sig.addElement(as);
        t.addCell(sig);
        doc.add(t);
    }

    // ==================== TERMS + FOOTER ====================
    private static void addTermsAndFooter(Document doc, InvoiceData d) throws DocumentException {
        if (d.termsAndConditions != null && !d.termsAndConditions.isBlank()) {
            Paragraph th = new Paragraph("Terms & Conditions:", fB(8, TEXT));
            th.setSpacingBefore(2f);
            doc.add(th);
            Paragraph tc = new Paragraph(d.termsAndConditions, fN(7, TEXT_SEC));
            tc.setSpacingAfter(4f);
            doc.add(tc);
        }

        if (d.jurisdiction != null && !d.jurisdiction.isBlank()) {
            Paragraph j = new Paragraph("Subject to " + d.jurisdiction + " jurisdiction only.", fB(7, TEXT_SEC));
            j.setAlignment(Element.ALIGN_CENTER);
            j.setSpacingAfter(4f);
            doc.add(j);
        }

        // QR placeholder
        PdfPTable qr = new PdfPTable(1);
        qr.setWidthPercentage(25);
        qr.setHorizontalAlignment(Element.ALIGN_LEFT);
        PdfPCell qrc = new PdfPCell(new Phrase("[ QR Code / e-Invoice Ref ]", fN(7, TEXT_SEC)));
        qrc.setBorderColor(BORDER);
        qrc.setPadding(10f);
        qrc.setMinimumHeight(40f);
        qrc.setHorizontalAlignment(Element.ALIGN_CENTER);
        qrc.setVerticalAlignment(Element.ALIGN_MIDDLE);
        qr.addCell(qrc);
        qr.setSpacingAfter(4f);
        doc.add(qr);

        if (d.footerNote != null && !d.footerNote.isBlank()) {
            Paragraph fn = new Paragraph(d.footerNote, fB(8, PRIMARY));
            fn.setAlignment(Element.ALIGN_CENTER);
            doc.add(fn);
        }

        Paragraph sys = new Paragraph("This is a computer-generated invoice and does not require a physical signature.", fN(7, TEXT_SEC));
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

    private static void addCardRow(PdfPCell card, String label, String value) {
        PdfPTable r = new PdfPTable(2);
        r.setWidthPercentage(100);
        try { r.setWidths(new float[]{1f, 1.6f}); } catch (Exception ignored) {}
        PdfPCell lc = new PdfPCell(new Phrase(label, fB(7, TEXT_SEC)));
        lc.setBorder(Rectangle.NO_BORDER); lc.setPadding(1.5f);
        PdfPCell vc = new PdfPCell(new Phrase(value, fN(7, TEXT)));
        vc.setBorder(Rectangle.NO_BORDER); vc.setPadding(1.5f);
        r.addCell(lc); r.addCell(vc);
        card.addElement(r);
    }

    private static void addRightLine(PdfPCell cell, String text, Font font) {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_RIGHT);
        cell.addElement(p);
    }

    private static void addCell(PdfPTable table, String text, Font font, int align, Color bg) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setPadding(3f);
        c.setBorderColor(new Color(224, 224, 224));
        c.setHorizontalAlignment(align);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setBackgroundColor(bg);
        table.addCell(c);
    }

    private static void addTotalRow(PdfPTable table, String label, String value, boolean highlight) {
        Color bg = highlight ? TOTAL_BG : Color.WHITE;
        Font f = highlight ? fB(9, TEXT) : fN(8, TEXT);
        PdfPCell lc = new PdfPCell(new Phrase(label, f));
        lc.setPadding(4f); lc.setBorder(Rectangle.NO_BORDER); lc.setBackgroundColor(bg);
        table.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(value, f));
        vc.setPadding(4f); vc.setBorder(Rectangle.NO_BORDER); vc.setBackgroundColor(bg);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(vc);
    }

    static String safe(String v) { return v == null || v.isBlank() ? "-" : v; }

    static String money(BigDecimal v) {
        return v == null ? "Rs. 0.00" : "Rs. " + v.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String pct(BigDecimal v) {
        return v == null ? "0" : v.stripTrailingZeros().toPlainString() + "%";
    }

    static String fmtDt(LocalDateTime dt) {
        return dt == null ? "-" : dt.format(DATE_FMT);
    }

    static String fmtDateTime(LocalDateTime dt) {
        return dt == null ? "-" : dt.format(DATETIME_FMT);
    }

    // ==================== NUMBER TO WORDS ====================
    private static final String[] ones = {"", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"};
    private static final String[] tens = {"", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"};

    static String convertToWords(long n) {
        if (n == 0) return "Zero";
        if (n < 0) return "Minus " + convertToWords(-n);
        String result = "";
        if (n / 10000000 > 0) { result += convertToWords(n / 10000000) + " Crore "; n %= 10000000; }
        if (n / 100000 > 0) { result += convertToWords(n / 100000) + " Lakh "; n %= 100000; }
        if (n / 1000 > 0) { result += convertToWords(n / 1000) + " Thousand "; n %= 1000; }
        if (n / 100 > 0) { result += convertToWords(n / 100) + " Hundred "; n %= 100; }
        if (n > 0) {
            if (!result.isEmpty()) result += "and ";
            if (n < 20) result += ones[(int) n];
            else { result += tens[(int) (n / 10)]; if (n % 10 > 0) result += " " + ones[(int) (n % 10)]; }
        }
        return result.trim();
    }
}
