import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen, Card, ListItem, SectionHeader } from '../../components';
import { useAuth } from '../../features/auth';
import { colors, fontSizes, spacing } from '../../theme';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAdmin } = useAuth();

  return (
    <AppScreen
      headerProps={{
        title: 'More & Catalogue',
        subtitle: 'Supporting master data and settings',
      }}
    >
      <SectionHeader title="Daily Operations" />
      <Card style={styles.card}>
        <ListItem
          title="Daily Shortage Notebook"
          subtitle="Daily medicines to order and MR contacts"
          avatarIcon="clipboard"
          avatarColor="green"
          onPress={() => navigation.navigate('ShortageNotebook')}
        />
      </Card>

      <SectionHeader title="Formulary & Master Data" />
      <Card style={styles.card}>
        <ListItem
          title="Manufacturers"
          subtitle="Pharmaceutical production companies"
          avatarIcon="manufacturers"
          avatarColor="blue"
          onPress={() => navigation.navigate('Manufacturers')}
        />
        <ListItem
          title="Compositions"
          subtitle="Multi-salt chemical formulas"
          avatarIcon="compositions"
          avatarColor="purple"
          onPress={() => navigation.navigate('Compositions')}
        />
        <ListItem
          title="Active Salts"
          subtitle="Active pharmaceutical ingredients (APIs)"
          avatarIcon="salts"
          avatarColor="green"
          onPress={() => navigation.navigate('Salts')}
        />
        <ListItem
          title="Composition Salts"
          subtitle="Salt strength & dosage unit combinations"
          avatarIcon="salts"
          avatarColor="amber"
          onPress={() => navigation.navigate('CompositionSalts')}
        />
        <ListItem
          title="Batches & Expiry"
          subtitle="Medicine batch records & expiration dates"
          avatarIcon="batches"
          avatarColor="red"
          onPress={() => navigation.navigate('Batches')}
        />
        <ListItem
          title="Medicine Alternatives"
          subtitle="Approved replacements for restricted medicines"
          avatarIcon="ban"
          avatarColor="red"
          onPress={() => navigation.navigate('MedicineAlternatives')}
          testID="more-menu-medicine-alternatives"
        />
      </Card>

      <SectionHeader title="Account & Preferences" />
      <Card style={styles.card}>
        <ListItem
          title="My Account"
          subtitle="Profile photo, personal details & contact"
          avatarIcon="users"
          avatarColor="teal"
          onPress={() => navigation.navigate('MyAccount')}
        />
      </Card>

      {isAdmin ? (
        <>
          <SectionHeader title="Administration (Admin Only)" />
          <Card style={styles.card}>
            <ListItem
              title="Attendance & Salary Register"
              subtitle="Monthly staff attendance & dynamic salary calculations"
              avatarIcon="calendar"
              avatarColor="green"
              onPress={() => navigation.navigate('AttendanceDashboard')}
            />
            <ListItem
              title="User Administration"
              subtitle="Manage Admin and Employee accounts"
              avatarIcon="users"
              avatarColor="purple"
              onPress={() => navigation.navigate('Users')}
            />
            <ListItem
              title="Commercial Pricing & Details"
              subtitle="Purchase rates, MRPs, and trade schemes"
              avatarIcon="commercial"
              avatarColor="amber"
              onPress={() => navigation.navigate('CommercialDetails')}
            />
            <ListItem
              title="Medicine Deals"
              subtitle="Agreed MRP, schemes, discounts & delivery status"
              avatarIcon="pricetag"
              avatarColor="teal"
              onPress={() => navigation.navigate('Deals')}
            />
          </Card>
        </>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Medicine Catalogue Mobile v1.0.0</Text>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});
