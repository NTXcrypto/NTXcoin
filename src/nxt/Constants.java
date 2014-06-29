package nxt;

import java.util.Calendar;
import java.util.TimeZone;

public final class Constants {

    public static final int BLOCK_HEADER_LENGTH = 232;
    public static final int MAX_NUMBER_OF_TRANSACTIONS = 255;
    public static final int MAX_PAYLOAD_LENGTH = MAX_NUMBER_OF_TRANSACTIONS * 160;
    public static final long MAX_BALANCE_NXT = 1000000000;
    public static final long ONE_NXT = 100000000;
    public static final long MAX_BALANCE_NQT = MAX_BALANCE_NXT * ONE_NXT;
    public static final long INITIAL_BASE_TARGET = 153722867;
    public static final long MAX_BASE_TARGET = MAX_BALANCE_NXT * INITIAL_BASE_TARGET;

    public static final int MAX_ALIAS_URI_LENGTH = 1000;
    public static final int MAX_ALIAS_LENGTH = 100;

    public static final int MAX_ARBITRARY_MESSAGE_LENGTH = 1000;

    public static final int MAX_ACCOUNT_NAME_LENGTH = 100;
    public static final int MAX_ACCOUNT_DESCRIPTION_LENGTH = 1000;

    public static final long MAX_ASSET_QUANTITY_QNT = 1000000000L * 100000000L;
    public static final long ASSET_ISSUANCE_FEE_NQT = 1000 * ONE_NXT;
    public static final int MIN_ASSET_NAME_LENGTH = 3;
    public static final int MAX_ASSET_NAME_LENGTH = 10;
    public static final int MAX_ASSET_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_ASSET_TRANSFER_COMMENT_LENGTH = 1000;

    public static final int MAX_POLL_NAME_LENGTH = 100;
    public static final int MAX_POLL_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_POLL_OPTION_LENGTH = 100;
    public static final int MAX_POLL_OPTION_COUNT = 100;

    public static final int MAX_DIGITAL_GOODS_QUANTITY = 1000000000;
    public static final int MAX_DIGITAL_GOODS_LISTING_NAME_LENGTH = 100;
    public static final int MAX_DIGITAL_GOODS_LISTING_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_DIGITAL_GOODS_LISTING_TAGS_LENGTH = 100;
    public static final int MAX_DIGITAL_GOODS_NOTE_LENGTH = 1000;
    public static final int MAX_DIGITAL_GOODS_LENGTH = 1000;

    public static final int MAX_HUB_ANNOUNCEMENT_URIS = 100;
    public static final int MAX_HUB_ANNOUNCEMENT_URI_LENGTH = 1000;
    public static final long MIN_HUB_EFFECTIVE_BALANCE = 100000;

    public static final boolean isTestnet = Nxt.getBooleanProperty("nxt.isTestnet");

    //public static final int ALIAS_SYSTEM_BLOCK = 0;
    public static final int TRANSPARENT_FORGING_BLOCK = 0;
    public static final int ARBITRARY_MESSAGES_BLOCK = 0;

    public static final int TRANSPARENT_FORGING_BLOCK_6 = isTestnet ? 1000 : 20000;//��������
    public static final int TRANSPARENT_FORGING_BLOCK_7 = isTestnet ? 0 : Integer.MAX_VALUE;//��Ϣ����
    public static final int NQT_BLOCK = isTestnet ? 0 : 0;
    public static final int FRACTIONAL_BLOCK = isTestnet ? NQT_BLOCK : 38300;
    public static final int ASSET_EXCHANGE_BLOCK = isTestnet ? NQT_BLOCK : 38350;
    public static final int REFERENCED_TRANSACTION_FULL_HASH_BLOCK = isTestnet ? 0 : 1100;
    public static final int REFERENCED_TRANSACTION_FULL_HASH_BLOCK_TIMESTAMP = isTestnet ? 0 : 0;
    
/*    public static final int GENESIS_FORGING_BLOCK = isTestnet ? 2147483647 : 2880;
    public static final int TRANSPARENT_FORGING_BLOCK_7 = isTestnet ? 0 : 2147483647;
    public static final int NQT_BLOCK = isTestnet ? 0 : 0;*/

    
    public static final int VOTING_SYSTEM_BLOCK = isTestnet ? 0 : Integer.MAX_VALUE;
    public static final int DIGITAL_GOODS_STORE_BLOCK = isTestnet ? 0 : Integer.MAX_VALUE;

    static final long UNCONFIRMED_POOL_DEPOSIT_NQT = (isTestnet ? 50 : 100) * ONE_NXT;

    public static final long EPOCH_BEGINNING;
    static {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        calendar.set(Calendar.YEAR, 2014);
        calendar.set(Calendar.MONTH, Calendar.JUNE);
        calendar.set(Calendar.DAY_OF_MONTH, 9);
        calendar.set(Calendar.HOUR_OF_DAY, 12);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        EPOCH_BEGINNING = calendar.getTimeInMillis();
    }

    public static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    private Constants() {} // never

}
