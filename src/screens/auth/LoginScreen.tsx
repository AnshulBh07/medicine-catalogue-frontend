import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import {
  AppScreen,
  Card,
  ConfirmDialog,
  ErrorMessage,
  PrimaryButton,
  TextInput,
} from '../../components';
import { useAuth } from '../../features/auth';
import { ApiError } from '../../services/api-client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const icon2Asset = require('../../../assets/icon3.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bottomBannerAsset = require('../../../assets/login-bottom-banner.png');

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(identifier, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect to server. Please verify your network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppScreen
      scrollable={false}
      backgroundColor="#F4F8F6"
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.root}>
        {/* Layer 0: Background Watermark (Top Left) */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Svg width={68} height={68} viewBox="0 0 72 72" fill="none">
            <Rect x="24" y="0" width="22" height="66" rx="5" fill="#D2E8DE" fillOpacity={0.45} />
            <Rect x="2" y="22" width="66" height="22" rx="5" fill="#D2E8DE" fillOpacity={0.45} />
            <Rect x="2" y="52" width="12" height="12" rx="2.5" fill="#D2E8DE" fillOpacity={0.4} />
            <Rect x="16" y="52" width="8" height="12" rx="2" fill="#D2E8DE" fillOpacity={0.25} />
          </Svg>
        </View>

        {/* Layer 0: Bottom Botanical Background Banner (Anchored at Bottom) */}
        <View style={styles.bottomBannerContainer} pointerEvents="none">
          <Image
            source={bottomBannerAsset}
            style={styles.bottomBanner}
            resizeMode="cover"
          />
        </View>

        {/* Layer 1: Floating Top-Right "Internal Use Only" Pill Badge */}
        <View style={styles.topRightBadge}>
          <Ionicons name="people" size={13} color="#0D6147" />
          <Text style={styles.topRightBadgeText}>Internal Use Only</Text>
        </View>

        {/* Layer 2: Main Flow (Branding, Card, Highlights) */}
        <View style={styles.mainFlow}>
          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={icon2Asset}
              style={styles.logo}
              resizeMode="contain"
              testID="login-app-logo"
              accessibilityLabel="A.P. Pharmacy Logo"
              accessibilityRole="image"
            />
            <Text style={styles.brandTitle}>A.P. PHARMACY</Text>
            <Text
              style={styles.brandSubtitle}
              accessibilityLabel="Medicine Catalogue System"
            >
              MEDICINE MANAGEMENT
            </Text>

            {/* Hairline Divider with Center Dot */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
            </View>

            <Text style={styles.tagline}>Welcome Back</Text>
            <Text style={styles.subtagline}>
              Sign in to access your pharmacy catalogue
            </Text>
          </View>

          {/* Main Login Card */}
          <Card style={styles.card}>
            {errorMessage ? (
              <ErrorMessage
                message={errorMessage}
                onRetry={() => setErrorMessage(null)}
              />
            ) : null}

            <TextInput
              label="Email or Phone"
              labelIcon={<Ionicons name="mail-outline" size={14} color="#0D6147" />}
              placeholder="admin1000@gmail.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
              testID="login-identifier-input"
              containerStyle={styles.inputContainer}
              wrapperStyle={styles.inputWrapper}
              inputStyle={styles.inputText}
            />

            <TextInput
              label="Password"
              labelIcon={<Ionicons name="lock-closed-outline" size={14} color="#0D6147" />}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              useEyeIcon
              autoCapitalize="none"
              editable={!isLoading}
              testID="login-password-input"
              containerStyle={styles.passwordContainer}
              wrapperStyle={styles.inputWrapper}
              inputStyle={styles.inputText}
            />

            {/* Secondary "Forgot password?" link positioned above Sign In button */}
            <TouchableOpacity
              onPress={() => setShowForgotPasswordInfo(true)}
              style={styles.forgotPasswordContainer}
              accessibilityRole="button"
              accessibilityLabel="Forgot password?"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="login-forgot-password-button"
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title={isLoading ? 'Signing In...' : 'Sign In'}
              onPress={handleSubmit}
              loading={isLoading}
              rightIcon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
              style={styles.submitButton}
              textStyle={styles.submitButtonText}
              testID="login-submit-button"
            />

            {/* Card Inner Separator */}
            <View style={styles.cardSeparator} />

            {/* Security Access Note */}
            <View style={styles.securityNote}>
              <View style={styles.securityBadge}>
                <Ionicons name="shield-outline" size={13} color="#0D6147" />
              </View>
              <Text style={styles.securityText}>
                Secure access for authorised team members
              </Text>
            </View>
          </Card>

          {/* 3 Feature Highlights Columns (Floating in Front of Background) */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightItem}>
              <View style={styles.highlightIconCircle}>
                <Ionicons name="book-outline" size={16} color="#0D6147" />
              </View>
              <Text style={styles.highlightLabel}>View Medicine{'\n'}Details</Text>
            </View>

            <View style={styles.highlightDivider} />

            <View style={styles.highlightItem}>
              <View style={styles.highlightIconCircle}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#0D6147" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <Ellipse cx="12" cy="4.5" rx="7.5" ry="2.5" />
                  <Path d="M4.5 4.5v15c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-15" />
                  <Path d="M4.5 9.5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5" />
                  <Path d="M4.5 14.5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5" />
                </Svg>
              </View>
              <Text style={styles.highlightLabel}>Manage{'\n'}Inventory Info</Text>
            </View>

            <View style={styles.highlightDivider} />

            <View style={styles.highlightItem}>
              <View style={styles.highlightIconCircle}>
                <Ionicons name="people-outline" size={16} color="#0D6147" />
              </View>
              <Text style={styles.highlightLabel}>For Our{'\n'}Pharmacy Team Only</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Dialog for Forgot Password */}
      <ConfirmDialog
        visible={showForgotPasswordInfo}
        title="Password Recovery"
        message="Password recovery is managed by system administrators. Please contact your pharmacy administrator to reset your account password."
        confirmText="Understood"
        cancelText="Close"
        onConfirm={() => setShowForgotPasswordInfo(false)}
        onCancel={() => setShowForgotPasswordInfo(false)}
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    padding: 0,
    flex: 1,
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 10,
    left: 16,
    zIndex: 0,
  },
  watermarkTextContainer: {
    marginTop: 2,
    paddingLeft: 2,
  },
  watermarkText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#5C7A6F',
    letterSpacing: 1.5,
    lineHeight: 11.5,
  },
  watermarkBar: {
    width: 26,
    height: 2.2,
    borderRadius: 1,
    backgroundColor: '#0D6147',
    marginTop: 2.5,
  },
  bottomBannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 0,
    overflow: 'hidden',
  },
  bottomBanner: {
    width: '100%',
    height: '100%',
  },
  topRightBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F1EA',
    borderRadius: 12,
    paddingVertical: 4.5,
    paddingHorizontal: 11,
    gap: 5,
  },
  topRightBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0D6147',
  },
  mainFlow: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-evenly',
    paddingTop: 24,
    paddingBottom: 98,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0D563E',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 9.8,
    fontWeight: '600',
    color: '#5C7A6F',
    letterSpacing: 2.8,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  dividerLine: {
    width: 80,
    height: 1,
    backgroundColor: '#CCDCD5',
  },
  dividerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8DAFA2',
  },
  tagline: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  subtagline: {
    fontSize: 13.5,
    color: '#475569',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 16,
    marginBottom: 0,
    shadowColor: '#0A3326',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  passwordContainer: {
    marginBottom: 0,
  },
  inputWrapper: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CFDFD7',
    borderWidth: 1.2,
    borderRadius: 9,
    minHeight: 44,
    height: 44,
    paddingHorizontal: 14,
  },
  inputText: {
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 7,
    marginBottom: 12,
    paddingVertical: 2,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0D6147',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#135E44',
    minHeight: 46,
    height: 46,
    borderRadius: 11,
    shadowColor: '#135E44',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: '#EDF3F0',
    marginTop: 15,
    marginBottom: 12,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  securityBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2F0EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 11.5,
    color: '#557268',
    fontWeight: '500',
  },
  highlightsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 0,
  },
  highlightItem: {
    flex: 1,
    alignItems: 'center',
  },
  highlightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2F0EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  highlightLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 12.5,
  },
  highlightDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#D0E1D8',
    alignSelf: 'center',
  },
});
