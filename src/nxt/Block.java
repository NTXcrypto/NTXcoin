package nxt;

import org.json.simple.JSONObject;

import java.math.BigInteger;
import java.util.List;

public interface Block {

    int getVersion();

    Long getId();

    String getStringId();

    int getHeight();

    int getTimestamp();

    Long getGeneratorId();

    byte[] getGeneratorPublicKey();

    Long getPreviousBlockId();

    byte[] getPreviousBlockHash();

    Long getNextBlockId();

    long getTotalAmountNQT();

    long getTotalFeeNQT();

    int getPayloadLength();

    byte[] getPayloadHash();

    List<Long> getTransactionIds();

    List<? extends Transaction> getTransactions();

    byte[] getGenerationSignature();

    byte[] getBlockSignature();

    long getBaseTarget();

    BigInteger getCumulativeDifficulty();

    JSONObject getJSONObject();

}
