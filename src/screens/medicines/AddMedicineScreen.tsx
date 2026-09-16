import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import {
  MedicineForm,
  type FormSaltRow,
  type MedicineFormProps,
  type SelectedMedicineImage,
} from './MedicineForm';

export type { FormSaltRow, MedicineFormProps, SelectedMedicineImage };

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddMedicineRouteProp = RouteProp<RootStackParamList, 'AddMedicine'>;

export interface AddMedicineScreenProps {
  route?: AddMedicineRouteProp;
}

export const AddMedicineScreen: React.FC<AddMedicineScreenProps> = ({ route: propRoute }) => {
  const navigation = useNavigation<NavigationProp>();
  let hookRoute: AddMedicineRouteProp | undefined;
  try {
    hookRoute = useRoute<AddMedicineRouteProp>();
  } catch {
    hookRoute = undefined;
  }
  const route = propRoute || hookRoute;
  const returnDealParams = route?.params?.returnDealParams;

  return (
    <MedicineForm
      mode="create"
      onSuccess={
        returnDealParams
          ? (medicine) => {
              navigation.navigate('AddDeal', {
                createdMedicineId: medicine.id,
              });
            }
          : undefined
      }
    />
  );
};

