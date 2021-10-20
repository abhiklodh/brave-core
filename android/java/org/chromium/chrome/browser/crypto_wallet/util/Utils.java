/* Copyright (c) 2021 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.chromium.chrome.browser.crypto_wallet.util;

import static android.content.ClipDescription.MIMETYPE_TEXT_PLAIN;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.view.inputmethod.InputMethodManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.chromium.base.ContextUtils;
import org.chromium.brave_wallet.mojom.BraveWalletConstants;
import org.chromium.brave_wallet.mojom.TxData;
import org.chromium.chrome.R;
import org.chromium.chrome.browser.crypto_wallet.activities.AccountDetailActivity;
import org.chromium.chrome.browser.crypto_wallet.activities.AddAccountActivity;
import org.chromium.chrome.browser.crypto_wallet.activities.AssetDetailActivity;
import org.chromium.chrome.browser.crypto_wallet.activities.BuySendSwapActivity;
import org.chromium.ui.widget.Toast;

import java.lang.NumberFormatException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public class Utils {
    public static final Pattern PASSWORD_PATTERN = Pattern.compile("^"
            + "(?=.*[0-9])" + // at least 1 digit
            "(?=.*[a-zA-Z])" + // any letter
            "(?=.*[$&+,:;=?@#|'<>.^*()%!-])" + // at least 1 special character
            "(?=\\S+$)" + // no white spaces
            ".{7,}" + // at least 7 characters
            "$");

    public static int ONBOARDING_ACTION = 1;
    public static int UNLOCK_WALLET_ACTION = 2;
    public static int RESTORE_WALLET_ACTION = 3;

    public static int ACCOUNT_ITEM = 1;
    public static int ASSET_ITEM = 2;
    public static int TRANSACTION_ITEM = 3;

    public static final int ACCOUNT_REQUEST_CODE = 2;

    private static final String PREF_CRYPTO_ONBOARDING = "crypto_onboarding";
    public static final String ADDRESS = "address";
    public static final String NAME = "name";
    public static final String ISIMPORTED = "isImported";

    public static List<String> getRecoveryPhraseAsList(String recoveryPhrase) {
        String[] recoveryPhraseArray = recoveryPhrase.split(" ");
        return new ArrayList<String>(Arrays.asList(recoveryPhraseArray));
    }

    public static String getRecoveryPhraseFromList(List<String> recoveryPhrases) {
        String recoveryPhrasesText = "";
        for (String phrase : recoveryPhrases) {
            recoveryPhrasesText = recoveryPhrasesText.concat(phrase).concat(" ");
        }
        return recoveryPhrasesText.trim();
    }

    public static void saveTextToClipboard(Context context, String textToCopy) {
        ClipboardManager clipboard =
                (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("", textToCopy);
        clipboard.setPrimaryClip(clip);
        Toast.makeText(context, R.string.text_has_been_copied, Toast.LENGTH_SHORT).show();
    }

    public static String getTextFromClipboard(Context context) {
        ClipboardManager clipboard =
                (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        String pasteData = "";
        if (!(clipboard.hasPrimaryClip())) {
            return pasteData;
        } else if (!(clipboard.getPrimaryClipDescription().hasMimeType(MIMETYPE_TEXT_PLAIN))) {
            return pasteData;
        } else {
            ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
            return item.getText().toString();
        }
    }

    public static boolean shouldShowCryptoOnboarding() {
        SharedPreferences mSharedPreferences = ContextUtils.getAppSharedPreferences();
        return mSharedPreferences.getBoolean(PREF_CRYPTO_ONBOARDING, true);
    }

    public static void disableCryptoOnboarding() {
        SharedPreferences mSharedPreferences = ContextUtils.getAppSharedPreferences();
        SharedPreferences.Editor sharedPreferencesEditor = mSharedPreferences.edit();
        sharedPreferencesEditor.putBoolean(PREF_CRYPTO_ONBOARDING, false);
        sharedPreferencesEditor.apply();
    }

    public static void hideKeyboard(Activity activity) {
        InputMethodManager imm =
                (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(activity.getCurrentFocus().getWindowToken(), 0);
    }

    public static void openBuySendSwapActivity(
            Activity activity, BuySendSwapActivity.ActivityType activityType) {
        assert activity != null;
        Intent buySendSwapActivityIntent = new Intent(activity, BuySendSwapActivity.class);
        buySendSwapActivityIntent.putExtra("activityType", activityType.getValue());
        activity.startActivity(buySendSwapActivityIntent);
    }

    public static void openAssetDetailsActivity(Activity activity) {
        assert activity != null;
        Intent assetDetailIntent = new Intent(activity, AssetDetailActivity.class);
        activity.startActivity(assetDetailIntent);
    }

    public static void openAddAccountActivity(Activity activity) {
        assert activity != null;
        Intent addAccountActivityIntent = new Intent(activity, AddAccountActivity.class);
        activity.startActivity(addAccountActivityIntent);
    }

    public static String[] getNetworksList(Activity activity) {
        List<String> categories = new ArrayList<String>();
        categories.add(activity.getText(R.string.mainnet).toString());
        categories.add(activity.getText(R.string.rinkeby).toString());
        categories.add(activity.getText(R.string.ropsten).toString());
        categories.add(activity.getText(R.string.goerli).toString());
        categories.add(activity.getText(R.string.kovan).toString());
        categories.add(activity.getText(R.string.localhost).toString());

        return categories.toArray(new String[0]);
    }

    public static String[] getNetworksAbbrevList(Activity activity) {
        List<String> categories = new ArrayList<String>();
        categories.add(activity.getText(R.string.mainnet_short).toString());
        categories.add(activity.getText(R.string.rinkeby_short).toString());
        categories.add(activity.getText(R.string.ropsten_short).toString());
        categories.add(activity.getText(R.string.goerli_short).toString());
        categories.add(activity.getText(R.string.kovan_short).toString());
        categories.add(activity.getText(R.string.localhost).toString());

        return categories.toArray(new String[0]);
    }

    public static List<String> getSlippageToleranceList(Activity activity) {
        List<String> categories = new ArrayList<String>();
        categories.add(activity.getText(R.string.crypto_wallet_tolerance_05).toString());
        categories.add(activity.getText(R.string.crypto_wallet_tolerance_1).toString());
        categories.add(activity.getText(R.string.crypto_wallet_tolerance_15).toString());
        categories.add(activity.getText(R.string.crypto_wallet_tolerance_3).toString());
        categories.add(activity.getText(R.string.crypto_wallet_tolerance_6).toString());

        return categories;
    }

    public static CharSequence getNetworkText(Activity activity, String chain_id) {
        CharSequence strNetwork = activity.getText(R.string.mainnet);
        switch (chain_id) {
            case BraveWalletConstants.RINKEBY_CHAIN_ID:
                strNetwork = activity.getText(R.string.rinkeby);
                break;
            case BraveWalletConstants.ROPSTEN_CHAIN_ID:
                strNetwork = activity.getText(R.string.ropsten);
                break;
            case BraveWalletConstants.GOERLI_CHAIN_ID:
                strNetwork = activity.getText(R.string.goerli);
                break;
            case BraveWalletConstants.KOVAN_CHAIN_ID:
                strNetwork = activity.getText(R.string.kovan);
                break;
            case BraveWalletConstants.LOCALHOST_CHAIN_ID:
                strNetwork = activity.getText(R.string.localhost);
                break;
            case BraveWalletConstants.MAINNET_CHAIN_ID:
            default:
                strNetwork = activity.getText(R.string.mainnet);
        }

        return strNetwork;
    }

    public static CharSequence getNetworkShortText(Activity activity, String chain_id) {
        CharSequence strNetwork = activity.getText(R.string.mainnet_short);
        switch (chain_id) {
            case BraveWalletConstants.RINKEBY_CHAIN_ID:
                strNetwork = activity.getText(R.string.rinkeby_short);
                break;
            case BraveWalletConstants.ROPSTEN_CHAIN_ID:
                strNetwork = activity.getText(R.string.ropsten_short);
                break;
            case BraveWalletConstants.GOERLI_CHAIN_ID:
                strNetwork = activity.getText(R.string.goerli_short);
                break;
            case BraveWalletConstants.KOVAN_CHAIN_ID:
                strNetwork = activity.getText(R.string.kovan_short);
                break;
            case BraveWalletConstants.LOCALHOST_CHAIN_ID:
                strNetwork = activity.getText(R.string.localhost);
                break;
            case BraveWalletConstants.MAINNET_CHAIN_ID:
            default:
                strNetwork = activity.getText(R.string.mainnet_short);
        }

        return strNetwork;
    }

    public static String getNetworkConst(Activity activity, String network) {
        String networkConst = BraveWalletConstants.MAINNET_CHAIN_ID;
        if (network.equals(activity.getText(R.string.rinkeby).toString())) {
            networkConst = BraveWalletConstants.RINKEBY_CHAIN_ID;
        } else if (network.equals(activity.getText(R.string.ropsten).toString())) {
            networkConst = BraveWalletConstants.ROPSTEN_CHAIN_ID;
        } else if (network.equals(activity.getText(R.string.goerli).toString())) {
            networkConst = BraveWalletConstants.GOERLI_CHAIN_ID;
        } else if (network.equals(activity.getText(R.string.kovan).toString())) {
            networkConst = BraveWalletConstants.KOVAN_CHAIN_ID;
        } else if (network.equals(activity.getText(R.string.localhost).toString())) {
            networkConst = BraveWalletConstants.LOCALHOST_CHAIN_ID;
        }

        return networkConst;
    }

    public static double fromHexWei(String number) {
        if (number.equals("0x0")) {
            return 0;
        }
        if (number.startsWith("0x")) {
            number = number.substring(2);
        }
        if (number.isEmpty()) {
            return 0;
        }
        BigInteger bigNumber = new BigInteger(number, 16);
        BigInteger divider = new BigInteger("1000000000000000000");
        BigDecimal bDecimal = new BigDecimal(bigNumber);
        BigDecimal bDecimalRes = bDecimal.divide(new BigDecimal(divider), MathContext.DECIMAL32);
        String resStr = bDecimalRes.toPlainString();

        return Double.valueOf(resStr);
    }

    public static double fromHexWeiToGWEI(String number) {
        try {
            if (number.equals("0x0")) {
                return 0;
            }
            if (number.startsWith("0x")) {
                number = number.substring(2);
            }
            if (number.isEmpty()) {
                return 0;
            }
            BigInteger bigNumber = new BigInteger(number, 16);
            String resStr = bigNumber.toString();

            return Double.valueOf(resStr);
        } catch (NumberFormatException exc) {
        }

        return 0;
    }

    public static String toWei(String number) {
        if (number.isEmpty()) {
            return "0";
        }
        int dotPosition = number.indexOf(".");
        String multiplier = "1000000000000000000";
        if (dotPosition != -1) {
            int zeroToRemove = number.length() - dotPosition - 1;
            multiplier = multiplier.substring(0, multiplier.length() - zeroToRemove);
            number = number.replace(".", "");
        }
        try {
            BigInteger bigNumber = new BigInteger(number, 10);
            BigInteger res = bigNumber.multiply(new BigInteger(multiplier));

            return res.toString();
        } catch (NumberFormatException ex) {
        }

        return "0";
    }

    public static double fromWei(String number) {
        if (number == null || number.isEmpty()) {
            return 0;
        }
        BigInteger bigNumber = new BigInteger(number);
        BigInteger divider = new BigInteger("1000000000000000000");
        BigDecimal bDecimal = new BigDecimal(bigNumber);
        BigDecimal bDecimalRes = bDecimal.divide(new BigDecimal(divider), MathContext.DECIMAL32);
        String resStr = bDecimalRes.toPlainString();

        return Double.valueOf(resStr);
    }

    public static String toHexWei(String number) {
        if (number.isEmpty()) {
            return "0x0";
        }
        int dotPosition = number.indexOf(".");
        String multiplier = "1000000000000000000";
        if (dotPosition != -1) {
            int zeroToRemove = number.length() - dotPosition - 1;
            multiplier = multiplier.substring(0, multiplier.length() - zeroToRemove);
            number = number.replace(".", "");
        }
        BigInteger bigNumber = new BigInteger(number, 10);
        BigInteger res = bigNumber.multiply(new BigInteger(multiplier));

        return "0x" + res.toString(16);
    }

    public static String toHexWeiFromGWEI(String number) {
        try {
            if (number.isEmpty()) {
                return "0x0";
            }
            int dotPosition = number.indexOf(".");
            if (dotPosition != -1) {
                number = number.substring(0, dotPosition);
            }
            BigInteger bigNumber = new BigInteger(number, 10);
            return "0x" + bigNumber.toString(16);
        } catch (NumberFormatException exc) {
        }

        return "0x0";
    }

    public static String toWeiHex(String number) {
        if (number.isEmpty()) {
            return "0x0";
        }
        BigInteger bigNumber = new BigInteger(number, 10);

        return "0x" + bigNumber.toString(16);
    }

    public static String multiplyHexBN(String number1, String number2) {
        if (number1.startsWith("0x")) {
            number1 = number1.substring(2);
        }
        if (number2.startsWith("0x")) {
            number2 = number2.substring(2);
        }
        BigInteger bigNumber1 = new BigInteger(number1, 16);
        BigInteger bigNumber2 = new BigInteger(number2, 16);

        BigInteger res = bigNumber1.multiply(bigNumber2);

        return "0x" + res.toString(16);
    }

    public static byte[] hexStrToNumberArray(String value) {
        if (value.startsWith("0x")) {
            value = value.substring(2);
        }
        if (value.isEmpty()) {
            return new byte[0];
        }

        byte[] data = new byte[value.length() / 2];
        for (int n = 0; n < value.length(); n += 2) {
            data[n / 2] = (byte) Long.parseLong(value.substring(n, 2 + n), 16);
        }

        return data;
    }

    public static TxData getTxData(
            String nonce, String gasPrice, String gasLimit, String to, String value, byte[] data) {
        TxData res = new TxData();
        res.nonce = nonce;
        res.gasPrice = gasPrice;
        res.gasLimit = gasLimit;
        res.to = to;
        res.value = value;
        res.data = data;

        return res;
    }

    public static String stripAccountAddress(String address) {
        String newAddress = "";

        if (address.length() > 6) {
            newAddress = address.substring(0, 6) + "***" + address.substring(address.length() - 5);
        }

        return newAddress;
    }

    public static boolean isJSONValid(String text) {
        try {
            new JSONObject(text);
        } catch (JSONException ex) {
            try {
                new JSONArray(text);
            } catch (JSONException ex1) {
                return false;
            }
        }
        return true;
    }

    public static boolean isSwapLiquidityErrorReason(String error) {
        try {
            JSONObject mainObj = new JSONObject(error);
            JSONArray errorsArray = mainObj.getJSONArray("validationErrors");
            if (errorsArray == null) {
                return false;
            }
            for (int index = 0; index < errorsArray.length(); index++) {
                JSONObject errorObj = errorsArray.getJSONObject(index);
                if (errorObj == null) {
                    continue;
                }
                String reason = errorObj.getString("reason");
                if (reason.equals("INSUFFICIENT_ASSET_LIQUIDITY")) {
                    return true;
                }
            }
        } catch (JSONException ex) {
        }

        return false;
    }

    public static Bitmap resizeBitmap(Bitmap source, int maxLength) {
        try {
            if (source.getHeight() >= source.getWidth()) {
                int targetHeight = maxLength;
                double aspectRatio = (double) source.getWidth() / (double) source.getHeight();
                int targetWidth = (int) (targetHeight * aspectRatio);

                Bitmap result = Bitmap.createScaledBitmap(source, targetWidth, targetHeight, false);
                return result;
            } else {
                int targetWidth = maxLength;
                double aspectRatio = ((double) source.getHeight()) / ((double) source.getWidth());
                int targetHeight = (int) (targetWidth * aspectRatio);

                Bitmap result = Bitmap.createScaledBitmap(source, targetWidth, targetHeight, false);
                return result;
            }
        } catch (Exception e) {
            return source;
        }
    }
}
