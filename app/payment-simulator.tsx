
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { BACKEND_URL } from '@/utils/api';

// Custom Modal Component for cross-platform compatibility
function ResultModal({
  visible,
  title,
  message,
  onClose,
  isError = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  isError?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const errorColor = '#FF3B30';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: bgColor }]}>
          <View
            style={[
              modalStyles.iconContainer,
              { backgroundColor: isError ? errorColor : primaryColor },
            ]}
          >
            <IconSymbol
              ios_icon_name={isError ? 'xmark.circle' : 'checkmark.circle'}
              android_material_icon_name={isError ? 'error' : 'check-circle'}
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={[modalStyles.title, { color: textColor }]}>{title}</Text>
          <ScrollView style={modalStyles.messageContainer}>
            <Text style={[modalStyles.message, { color: textColor }]}>{message}</Text>
          </ScrollView>
          <TouchableOpacity
            style={[modalStyles.button, { backgroundColor: primaryColor }]}
            onPress={onClose}
          >
            <Text style={modalStyles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PaymentSimulatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  
  // Form fields with default values from the provided JSON
  const [password, setPassword] = useState('MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjYwMjAzMjMxNTE5');
  const [businessShortCode, setBusinessShortCode] = useState('174379');
  const [timestamp, setTimestamp] = useState('20260203231519');
  const [amount, setAmount] = useState('1');
  const [partyA, setPartyA] = useState('254708374149');
  const [partyB, setPartyB] = useState('174379');
  const [transactionType, setTransactionType] = useState('CustomerPayBillOnline');
  const [phoneNumber, setPhoneNumber] = useState('254708374149');
  const [transactionDesc, setTransactionDesc] = useState('Test');
  const [accountReference, setAccountReference] = useState('Test');
  const [callbackURL, setCallbackURL] = useState('https://mydomain.com/mpesa-express-simulate/');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalIsError, setModalIsError] = useState(false);

  console.log('Payment Simulator screen loaded');

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const cardColor = isDark ? colors.cardDark : colors.card;

  const showModal = (title: string, message: string, isError: boolean = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalIsError(isError);
    setModalVisible(true);
  };

  const handleSimulatePayment = async () => {
    console.log('=== M-Pesa Payment Simulation ===');
    console.log('Simulating M-Pesa STK Push with sandbox credentials');

    setLoading(true);

    try {
      const payload = {
        Password: password,
        BusinessShortCode: businessShortCode,
        Timestamp: timestamp,
        Amount: amount,
        PartyA: partyA,
        PartyB: partyB,
        TransactionType: transactionType,
        PhoneNumber: phoneNumber,
        TransactionDesc: transactionDesc,
        AccountReference: accountReference,
        CallBackURL: callbackURL,
      };

      console.log('Payload:', JSON.stringify(payload, null, 2));

      // Send to M-Pesa Sandbox STK Push endpoint
      const mpesaUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
      
      console.log('Sending request to M-Pesa Sandbox:', mpesaUrl);

      const response = await fetch(mpesaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`, // In sandbox, password can be used as token for testing
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      const responseText = await response.text();
      console.log('Response body:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        data = { rawResponse: responseText };
      }

      setLoading(false);

      if (response.ok) {
        const successMessage = `✅ Payment Simulation Successful!\n\n${JSON.stringify(data, null, 2)}`;
        console.log('Success:', successMessage);
        showModal('Simulation Successful', successMessage, false);
      } else {
        const errorMessage = `❌ Payment Simulation Failed\n\nStatus: ${response.status}\n\n${JSON.stringify(data, null, 2)}`;
        console.error('Error:', errorMessage);
        showModal('Simulation Failed', errorMessage, true);
      }
    } catch (error: any) {
      console.error('=== Simulation Error ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error details:', error);

      setLoading(false);

      const errorMessage = `Network Error:\n\n${error?.message || 'Unknown error occurred'}`;
      showModal('Network Error', errorMessage, true);
    }
  };

  const handleGenerateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const newTimestamp = `${year}${month}${date}${hours}${minutes}${seconds}`;
    setTimestamp(newTimestamp);
    console.log('Generated new timestamp:', newTimestamp);
  };

  const handleReset = () => {
    console.log('Resetting form to default values');
    setPassword('MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjYwMjAzMjMxNTE5');
    setBusinessShortCode('174379');
    setTimestamp('20260203231519');
    setAmount('1');
    setPartyA('254708374149');
    setPartyB('174379');
    setTransactionType('CustomerPayBillOnline');
    setPhoneNumber('254708374149');
    setTransactionDesc('Test');
    setAccountReference('Test');
    setCallbackURL('https://mydomain.com/mpesa-express-simulate/');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'M-Pesa Payment Simulator',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
          headerBackTitle: 'Back',
        }}
      />

      <ResultModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        isError={modalIsError}
        onClose={() => setModalVisible(false)}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: cardColor }]}>
          <IconSymbol
            ios_icon_name="wrench.and.screwdriver"
            android_material_icon_name="settings"
            size={48}
            color={primaryColor}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>
            M-Pesa Sandbox Simulator
          </Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            Test M-Pesa STK Push integration with sandbox credentials
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Authentication</Text>
          
          <Text style={[styles.label, { color: textColor }]}>Password (Base64)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { backgroundColor: cardColor, color: textColor }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={isDark ? '#888' : '#999'}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Business Details</Text>
          
          <Text style={[styles.label, { color: textColor }]}>Business Short Code</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={businessShortCode}
            onChangeText={setBusinessShortCode}
            placeholder="174379"
            placeholderTextColor={isDark ? '#888' : '#999'}
            keyboardType="numeric"
          />

          <View style={styles.timestampRow}>
            <View style={styles.timestampInputContainer}>
              <Text style={[styles.label, { color: textColor }]}>Timestamp</Text>
              <TextInput
                style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
                value={timestamp}
                onChangeText={setTimestamp}
                placeholder="YYYYMMDDHHmmss"
                placeholderTextColor={isDark ? '#888' : '#999'}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: primaryColor }]}
              onPress={handleGenerateTimestamp}
            >
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="access-time"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.generateButtonText}>Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Transaction Details</Text>
          
          <Text style={[styles.label, { color: textColor }]}>Amount (KES)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="1"
            placeholderTextColor={isDark ? '#888' : '#999'}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: textColor }]}>Transaction Type</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={transactionType}
            onChangeText={setTransactionType}
            placeholder="CustomerPayBillOnline"
            placeholderTextColor={isDark ? '#888' : '#999'}
          />

          <Text style={[styles.label, { color: textColor }]}>Party A (Payer)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={partyA}
            onChangeText={setPartyA}
            placeholder="254708374149"
            placeholderTextColor={isDark ? '#888' : '#999'}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: textColor }]}>Party B (Receiver)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={partyB}
            onChangeText={setPartyB}
            placeholder="174379"
            placeholderTextColor={isDark ? '#888' : '#999'}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: textColor }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="254708374149"
            placeholderTextColor={isDark ? '#888' : '#999'}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: textColor }]}>Account Reference</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={accountReference}
            onChangeText={setAccountReference}
            placeholder="Test"
            placeholderTextColor={isDark ? '#888' : '#999'}
          />

          <Text style={[styles.label, { color: textColor }]}>Transaction Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={transactionDesc}
            onChangeText={setTransactionDesc}
            placeholder="Test"
            placeholderTextColor={isDark ? '#888' : '#999'}
          />

          <Text style={[styles.label, { color: textColor }]}>Callback URL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
            value={callbackURL}
            onChangeText={setCallbackURL}
            placeholder="https://mydomain.com/mpesa-express-simulate/"
            placeholderTextColor={isDark ? '#888' : '#999'}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: textColor }]}
            onPress={handleReset}
          >
            <IconSymbol
              ios_icon_name="arrow.counterclockwise"
              android_material_icon_name="refresh"
              size={20}
              color={textColor}
            />
            <Text style={[styles.resetButtonText, { color: textColor }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.simulateButton, { backgroundColor: primaryColor }]}
            onPress={handleSimulatePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="play.circle"
                  android_material_icon_name="play-arrow"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.simulateButtonText}>Simulate Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: cardColor }]}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={primaryColor}
          />
          <Text style={[styles.infoText, { color: textColor }]}>
            This simulator sends a test STK Push request to the M-Pesa Sandbox API. Use it to test your integration without real money.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: '80%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  messageContainer: {
    maxHeight: 300,
    marginBottom: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timestampInputContainer: {
    flex: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  simulateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
