
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
  Platform,
  Modal,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { useUser } from '@/contexts/UserContext';
import { COUNTIES, County } from '@/constants/counties';
import { SERVICE_CATEGORIES } from '@/constants/data';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function RegisterProviderScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { setUser, setProvider } = useUser();

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [identityNumber, setIdentityNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County>(COUNTIES[46]); // Default to Nairobi
  const [commuteDistance, setCommuteDistance] = useState('20');
  const [profileImage, setProfileImage] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [countySearch, setCountySearch] = useState('');
  const [servicesSearch, setServicesSearch] = useState('');

  console.log('Provider registration screen loaded');

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const primaryColor = isDark ? colors.primaryDark : colors.primary;
  const cardColor = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;
  const inputBg = isDark ? colors.cardDark : colors.card;

  // Check if emails match and both are filled
  const emailsMatch = email.length > 0 && confirmEmail.length > 0 && email === confirmEmail;
  const emailsDontMatch = confirmEmail.length > 0 && email !== confirmEmail;

  // Filter counties based on search
  const filteredCounties = COUNTIES.filter(county =>
    county.countyName.toLowerCase().includes(countySearch.toLowerCase())
  );

  // Filter services based on search
  const filteredServices = SERVICE_CATEGORIES.filter(service =>
    service.toLowerCase().includes(servicesSearch.toLowerCase())
  );

  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const dateDisplay = formatDate(dateOfBirth);

  const handlePickImage = async () => {
    console.log('Image picker opened');
    
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log('Image selected:', imageUri);
      
      // Upload image
      await uploadImage(imageUri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploadingImage(true);
    console.log('Uploading image:', uri);

    try {
      const { BACKEND_URL } = await import('@/utils/api');
      
      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);

      console.log('Sending image upload request');

      const response = await fetch(`${BACKEND_URL}/api/upload/profile-picture`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('Image uploaded successfully:', data);
      
      setProfileImage(data.url);
      setUploadingImage(false);
      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      setUploadingImage(false);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    }
  };

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
      console.log('Service removed:', service);
    } else {
      setSelectedServices([...selectedServices, service]);
      console.log('Service added:', service);
    }
  };

  const selectedServicesText = selectedServices.length > 0
    ? `${selectedServices.length} selected`
    : 'Select services';

  const handleRegister = async () => {
    console.log('Provider registration initiated', { email, firstName, lastName, gender });

    if (!email || !confirmEmail || !firstName || !lastName || !identityNumber || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (email !== confirmEmail) {
      Alert.alert('Error', 'Email addresses do not match');
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    const distance = parseInt(commuteDistance, 10);
    if (isNaN(distance) || distance < 1 || distance > 100) {
      Alert.alert('Error', 'Commute distance must be between 1 and 100 KMs');
      return;
    }

    setLoading(true);

    try {
      const { apiCall } = await import('@/utils/api');
      
      // Format date as YYYY-MM-DD for the API
      const formattedDate = dateOfBirth.toISOString().split('T')[0];
      
      const requestBody = {
        email,
        firstName,
        lastName,
        gender: gender.charAt(0).toUpperCase() + gender.slice(1),
        dateOfBirth: formattedDate,
        identityNumber,
        county: selectedCounty.countyCode,
        commuteDistance: distance,
        phoneNumber,
        services: selectedServices,
        training: [],
        ...(profileImage ? { photoUrl: profileImage } : {}),
      };

      console.log('Sending provider registration request:', requestBody);

      const response = await apiCall('/api/users/register-provider', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('Provider registration response:', response);

      const registeredUser = {
        id: response.user.id,
        email: response.user.email,
        userType: response.user.userType as 'provider',
        firstName,
        lastName,
        county: selectedCounty.countyName,
      };

      const registeredProvider = {
        id: response.provider.id,
        providerCode: response.provider.providerCode,
        gender,
        phoneNumber,
        subscriptionStatus: 'inactive' as const,
        photoUrl: profileImage,
      };

      setUser(registeredUser);
      setProvider(registeredProvider);
      console.log('Provider registered successfully', { user: registeredUser, provider: registeredProvider });
      setLoading(false);
      
      // Navigate to subscription payment
      router.push('/subscription-payment');
    } catch (error) {
      console.error('Provider registration error:', error);
      setLoading(false);
      
      let errorMessage = 'Failed to register. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (errorMessage.includes('JSON') || errorMessage.includes('Unexpected character')) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        }
      }
      
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Provider Registration</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Create your account to find gigs
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: textColor }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Enter your email"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: textColor }]}>Confirm Email *</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: inputBg, 
                  color: textColor, 
                  borderColor: emailsDontMatch ? '#FF3B30' : borderColor,
                  flex: 1,
                }
              ]}
              placeholder="Re-enter your email"
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailsMatch && (
              <View style={styles.checkMarkContainer}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#34C759"
                />
              </View>
            )}
          </View>
          {emailsDontMatch && (
            <Text style={styles.errorText}>Emails do not match</Text>
          )}

          <Text style={[styles.label, { color: textColor }]}>First Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Enter your first name"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: textColor }]}>Last Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Enter your last name"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: textColor }]}>Gender *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setGender('male')}
            >
              <View style={[styles.radio, { borderColor }]}>
                {gender === 'male' && (
                  <View style={[styles.radioInner, { backgroundColor: primaryColor }]} />
                )}
              </View>
              <Text style={[styles.radioLabel, { color: textColor }]}>Male</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setGender('female')}
            >
              <View style={[styles.radio, { borderColor }]}>
                {gender === 'female' && (
                  <View style={[styles.radioInner, { backgroundColor: primaryColor }]} />
                )}
              </View>
              <Text style={[styles.radioLabel, { color: textColor }]}>Female</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: textColor }]}>Date of Birth *</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: inputBg, borderColor, justifyContent: 'center' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: textColor }}>{dateDisplay}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDateOfBirth(selectedDate);
                  console.log('Date of birth selected:', selectedDate);
                }
              }}
              maximumDate={new Date()}
            />
          )}

          <Text style={[styles.label, { color: textColor }]}>Identity Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Enter your ID number"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={identityNumber}
            onChangeText={setIdentityNumber}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, { color: textColor }]}>
            Profile Picture (Full Body) *
          </Text>
          <TouchableOpacity
            style={[styles.imageUploadButton, { backgroundColor: inputBg, borderColor }]}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : profileImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={resolveImageSource(profileImage)}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <Text style={[styles.imageUploadText, { color: primaryColor }]}>
                  Change Picture
                </Text>
              </View>
            ) : (
              <View style={styles.imageUploadContent}>
                <IconSymbol
                  ios_icon_name="camera.fill"
                  android_material_icon_name="camera"
                  size={32}
                  color={textColor}
                />
                <Text style={[styles.imageUploadText, { color: textColor }]}>
                  Upload Full Body Picture
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.privacyNotice, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.08)' }]}>
            <View style={styles.privacyIconContainer}>
              <IconSymbol
                ios_icon_name="lock.shield.fill"
                android_material_icon_name="verified-user"
                size={20}
                color="#34C759"
              />
            </View>
            <View style={styles.privacyTextContainer}>
              <Text style={[styles.privacyTitle, { color: textColor }]}>
                Your Photo is Safe
              </Text>
              <Text style={[styles.privacyText, { color: textColor }]}>
                Nyota-KE does not store your photo data. Your image is securely uploaded and used only for profile display to help clients identify service providers.
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: textColor }]}>County *</Text>
          <TouchableOpacity
            style={[styles.countyButton, { backgroundColor: inputBg, borderColor }]}
            onPress={() => {
              setShowCountyModal(true);
              console.log('County selection modal opened');
            }}
          >
            <View style={styles.countyButtonContent}>
              <Text style={[styles.countyButtonText, { color: textColor }]}>
                {selectedCounty.countyName}
              </Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={textColor}
              />
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: textColor }]}>
            Preferred Commute Distance (KMs) *
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Max 100 KMs"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={commuteDistance}
            onChangeText={setCommuteDistance}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, { color: textColor }]}>Services *</Text>
          <TouchableOpacity
            style={[styles.countyButton, { backgroundColor: inputBg, borderColor }]}
            onPress={() => {
              setShowServicesModal(true);
              console.log('Services selection modal opened');
            }}
          >
            <View style={styles.countyButtonContent}>
              <Text style={[styles.countyButtonText, { color: textColor }]}>
                {selectedServicesText}
              </Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={textColor}
              />
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: textColor }]}>Phone Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="e.g., 0712345678"
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Continue to Payment'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* County Selection Modal */}
      <Modal
        visible={showCountyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountyModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Select County</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCountyModal(false);
                setCountySearch('');
                console.log('County selection modal closed');
              }}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={28}
                color={textColor}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={isDark ? '#888' : '#999'}
            />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search counties..."
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={countySearch}
              onChangeText={setCountySearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView style={styles.countyList}>
            {filteredCounties.map((county) => {
              const isSelected = selectedCounty.countyNumber === county.countyNumber;
              return (
                <TouchableOpacity
                  key={county.countyNumber}
                  style={[
                    styles.countyItem,
                    { borderBottomColor: borderColor },
                    isSelected && { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }
                  ]}
                  onPress={() => {
                    setSelectedCounty(county);
                    setShowCountyModal(false);
                    setCountySearch('');
                    console.log('County selected:', county.countyName, 'Code:', county.countyCode);
                  }}
                >
                  <View style={styles.countyItemContent}>
                    <Text style={[styles.countyItemName, { color: textColor }]}>
                      {county.countyName}
                    </Text>
                    {isSelected && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color={primaryColor}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Services Selection Modal */}
      <Modal
        visible={showServicesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServicesModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Select Services</Text>
            <TouchableOpacity
              onPress={() => {
                setShowServicesModal(false);
                setServicesSearch('');
                console.log('Services selection modal closed');
              }}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={28}
                color={textColor}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={isDark ? '#888' : '#999'}
            />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search services..."
              placeholderTextColor={isDark ? '#888' : '#999'}
              value={servicesSearch}
              onChangeText={setServicesSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.selectedCountBadge}>
            <Text style={[styles.selectedCountText, { color: primaryColor }]}>
              {selectedServices.length} services selected
            </Text>
          </View>

          <ScrollView style={styles.countyList}>
            {filteredServices.map((service, index) => {
              const isSelected = selectedServices.includes(service);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.countyItem,
                    { borderBottomColor: borderColor },
                    isSelected && { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }
                  ]}
                  onPress={() => toggleService(service)}
                >
                  <View style={styles.countyItemContent}>
                    <Text style={[styles.countyItemName, { color: textColor, flex: 1 }]}>
                      {service}
                    </Text>
                    {isSelected && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color={primaryColor}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: primaryColor }]}
              onPress={() => {
                setShowServicesModal(false);
                setServicesSearch('');
                console.log('Services confirmed:', selectedServices);
              }}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: -8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  inputWithIcon: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkMarkContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  imageUploadButton: {
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  imageUploadContent: {
    alignItems: 'center',
    gap: 12,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    gap: 12,
  },
  imagePreview: {
    width: 120,
    height: 160,
    borderRadius: 8,
  },
  privacyNotice: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: -8,
  },
  privacyIconContainer: {
    paddingTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
    gap: 4,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  privacyText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  countyButton: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  countyButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  selectedCountBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countyList: {
    flex: 1,
  },
  countyItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  countyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countyItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});
