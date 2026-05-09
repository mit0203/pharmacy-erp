package com.sygnusbiotech.pharmacyerp.accounting.service;

import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountRequest;
import com.sygnusbiotech.pharmacyerp.accounting.dto.AccountResponse;
import com.sygnusbiotech.pharmacyerp.accounting.mapper.AccountMapper;
import com.sygnusbiotech.pharmacyerp.accounting.model.Account;
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

@Service
@RequiredArgsConstructor
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountMapper accountMapper;

    @Transactional
    public AccountResponse createAccount(AccountRequest request) {
        if (accountRepository.existsByAccountCodeAndIsDeletedFalse(request.getAccountCode())) {
            throw new BusinessException("Account code '" + request.getAccountCode() + "' already exists", HttpStatus.CONFLICT);
        }

        Account account = accountMapper.toEntity(request);
        account.setCurrentBalance(request.getOpeningBalance() != null ? request.getOpeningBalance() : java.math.BigDecimal.ZERO);

        account = accountRepository.save(account);
        log.info("Account created: {} - {}", account.getAccountCode(), account.getAccountName());
        return accountMapper.toResponse(account);
    }

    @Transactional
    public AccountResponse updateAccount(String id, AccountRequest request) {
        Account account = getActiveAccountById(id);

        // If account code is changing, validate uniqueness
        if (!account.getAccountCode().equals(request.getAccountCode())) {
            if (accountRepository.existsByAccountCodeAndIsDeletedFalse(request.getAccountCode())) {
                throw new BusinessException("Account code '" + request.getAccountCode() + "' already exists", HttpStatus.CONFLICT);
            }
        }

        accountMapper.updateEntityFromRequest(request, account);
        account = accountRepository.save(account);
        log.info("Account updated: {} - {}", account.getAccountCode(), account.getAccountName());
        return accountMapper.toResponse(account);
    }

    public AccountResponse getAccountById(String id) {
        return accountMapper.toResponse(getActiveAccountById(id));
    }

    public Page<AccountResponse> getAllAccounts(String search, Pageable pageable) {
        Page<Account> accounts;
        if (search != null && !search.trim().isEmpty()) {
            accounts = accountRepository.searchActiveAccounts(search, pageable);
        } else {
            accounts = accountRepository.findByIsDeletedFalse(pageable);
        }
        return accounts.map(accountMapper::toResponse);
    }

    @Transactional
    public void softDeleteAccount(String id) {
        Account account = getActiveAccountById(id);

        if (ledgerEntryRepository.existsByAccountId(id)) {
            throw new BusinessException("Cannot delete account with linked ledger entries", HttpStatus.BAD_REQUEST);
        }

        account.setDeleted(true);
        accountRepository.save(account);
        log.info("Account soft-deleted: {} - {}", account.getAccountCode(), account.getAccountName());
    }

    public java.math.BigDecimal getAccountBalance(String id) {
        Account account = getActiveAccountById(id);
        return account.getCurrentBalance();
    }

    /**
     * Internal helper — retrieves an active (non-deleted) account or throws NOT_FOUND.
     * Also used by LedgerEntryService for account validation.
     */
    public Account getActiveAccountById(String id) {
        return accountRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BusinessException("Account not found with ID: " + id, HttpStatus.NOT_FOUND));
    }
}
