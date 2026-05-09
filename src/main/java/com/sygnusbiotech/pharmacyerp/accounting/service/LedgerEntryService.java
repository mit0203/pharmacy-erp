package com.sygnusbiotech.pharmacyerp.accounting.service;

import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.LedgerEntryResponse;
import com.sygnusbiotech.pharmacyerp.accounting.mapper.LedgerEntryMapper;
import com.sygnusbiotech.pharmacyerp.accounting.model.Account;
import com.sygnusbiotech.pharmacyerp.accounting.model.EntryType;
import com.sygnusbiotech.pharmacyerp.accounting.model.LedgerEntry;
import com.sygnusbiotech.pharmacyerp.accounting.repository.AccountRepository;
import com.sygnusbiotech.pharmacyerp.accounting.repository.LedgerEntryRepository;
import com.sygnusbiotech.pharmacyerp.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LedgerEntryService {

    private static final Logger log = LoggerFactory.getLogger(LedgerEntryService.class);

    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final AccountService accountService;
    private final LedgerEntryMapper ledgerEntryMapper;

    /**
     * Creates a ledger entry from a manual request (controller).
     */
    @Transactional
    public LedgerEntryResponse createLedgerEntry(LedgerEntryRequest request) {
        validateLedgerEntryRequest(request);

        Account debitAccount = accountService.getActiveAccountById(request.getDebitAccountId());
        Account creditAccount = accountService.getActiveAccountById(request.getCreditAccountId());

        validateAccountsAreActive(debitAccount, creditAccount);

        LedgerEntry entry = ledgerEntryMapper.toEntity(request);
        entry = ledgerEntryRepository.save(entry);

        updateAccountBalances(debitAccount, creditAccount, request.getAmount());

        log.info("Ledger entry created: {} | Debit: {} | Credit: {} | Amount: {}",
                entry.getId(), debitAccount.getAccountCode(), creditAccount.getAccountCode(), request.getAmount());

        return enrichResponse(ledgerEntryMapper.toResponse(entry), debitAccount, creditAccount);
    }

    /**
     * Integration hook — allows Purchase/Sales modules to create accounting entries
     * without constructing a LedgerEntryRequest DTO.
     * Includes built-in duplicate prevention using referenceType + referenceId + entryType.
     *
     * @param referenceType e.g. "PURCHASE_ORDER", "SALES_ORDER"
     * @param referenceId   the order number (e.g. "PO-1234", "SO-5678")
     * @param description   human-readable description for the ledger entry
     * @param debitAccountCode  account code of the debit account (e.g. "PURCHASE", "AR")
     * @param creditAccountCode account code of the credit account (e.g. "AP", "SALES")
     * @param amount        transaction amount (must be greater than 0)
     * @param entryType     type of entry (PURCHASE, SALES, PURCHASE_PAYMENT, SALES_RECEIPT, etc.)
     */
    @Transactional
    public void createEntryFromEvent(
            String referenceType,
            String referenceId,
            String description,
            String debitAccountCode,
            String creditAccountCode,
            BigDecimal amount,
            EntryType entryType) {

        // Duplicate prevention: skip if entry already exists for this reference + entry type
        if (ledgerEntryRepository.existsByReferenceTypeAndReferenceIdAndEntryTypeAndIsDeletedFalse(
                referenceType, referenceId, entryType)) {
            log.warn("Duplicate ledger entry skipped: referenceType={}, referenceId={}, entryType={}",
                    referenceType, referenceId, entryType);
            return;
        }

        // Resolve accounts by code
        Account debitAccount = getAccountByCode(debitAccountCode);
        Account creditAccount = getAccountByCode(creditAccountCode);

        LedgerEntryRequest request = new LedgerEntryRequest();
        request.setTransactionDate(LocalDateTime.now());
        request.setReferenceType(referenceType);
        request.setReferenceId(referenceId);
        request.setDescription(description);
        request.setDebitAccountId(debitAccount.getId());
        request.setCreditAccountId(creditAccount.getId());
        request.setAmount(amount);
        request.setEntryType(entryType);

        createLedgerEntry(request);
    }

    public Page<LedgerEntryResponse> getAllLedgerEntries(String search, Pageable pageable) {
        Page<LedgerEntry> entries;
        if (search != null && !search.trim().isEmpty()) {
            entries = ledgerEntryRepository.searchActiveLedgerEntries(search, pageable);
        } else {
            entries = ledgerEntryRepository.findByIsDeletedFalse(pageable);
        }
        return entries.map(this::enrichResponse);
    }

    public Page<LedgerEntryResponse> getLedgerEntriesByAccount(String accountId, Pageable pageable) {
        // Validate that the account exists
        accountService.getActiveAccountById(accountId);

        Page<LedgerEntry> entries = ledgerEntryRepository.findByAccountId(accountId, pageable);
        return entries.map(this::enrichResponse);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private Account getAccountByCode(String accountCode) {
        return accountRepository.findByAccountCodeAndIsDeletedFalse(accountCode)
                .orElseThrow(() -> new BusinessException(
                        "Accounting account not found for code: " + accountCode +
                        ". Please ensure the account exists in the Chart of Accounts.",
                        HttpStatus.NOT_FOUND));
    }

    private void validateLedgerEntryRequest(LedgerEntryRequest request) {
        if (request.getDebitAccountId().equals(request.getCreditAccountId())) {
            throw new BusinessException("Debit account and credit account must be different", HttpStatus.BAD_REQUEST);
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Amount must be greater than 0", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateAccountsAreActive(Account debitAccount, Account creditAccount) {
        if (!debitAccount.isActive()) {
            throw new BusinessException("Debit account '" + debitAccount.getAccountCode() + "' is not active", HttpStatus.BAD_REQUEST);
        }
        if (!creditAccount.isActive()) {
            throw new BusinessException("Credit account '" + creditAccount.getAccountCode() + "' is not active", HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Updates account balances after a ledger entry is created.
     * Debit account balance increases, credit account balance decreases.
     * Negative balances are allowed for now.
     */
    private void updateAccountBalances(Account debitAccount, Account creditAccount, BigDecimal amount) {
        debitAccount.setCurrentBalance(debitAccount.getCurrentBalance().add(amount));
        creditAccount.setCurrentBalance(creditAccount.getCurrentBalance().subtract(amount));

        accountRepository.save(debitAccount);
        accountRepository.save(creditAccount);

        log.debug("Balance updated — Debit account {}: {} | Credit account {}: {}",
                debitAccount.getAccountCode(), debitAccount.getCurrentBalance(),
                creditAccount.getAccountCode(), creditAccount.getCurrentBalance());
    }

    /**
     * Enriches a LedgerEntryResponse with account names by looking up both accounts.
     */
    private LedgerEntryResponse enrichResponse(LedgerEntry entry) {
        LedgerEntryResponse response = ledgerEntryMapper.toResponse(entry);

        accountRepository.findByIdAndIsDeletedFalse(entry.getDebitAccountId())
                .ifPresent(a -> response.setDebitAccountName(a.getAccountName()));
        accountRepository.findByIdAndIsDeletedFalse(entry.getCreditAccountId())
                .ifPresent(a -> response.setCreditAccountName(a.getAccountName()));

        return response;
    }

    /**
     * Enriches a LedgerEntryResponse when accounts are already loaded.
     */
    private LedgerEntryResponse enrichResponse(LedgerEntryResponse response, Account debitAccount, Account creditAccount) {
        response.setDebitAccountName(debitAccount.getAccountName());
        response.setCreditAccountName(creditAccount.getAccountName());
        return response;
    }
}
