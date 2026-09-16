import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MedicineForm } from './MedicineForm';
import type { RootStackParamList } from '../../types/navigation';

type EditMedicineRouteProp = RouteProp<RootStackParamList, 'EditMedicine'>;

export const EditMedicineScreen: React.FC = () => {
  const route = useRoute<EditMedicineRouteProp>();
  const { id } = route.params;

  return <MedicineForm mode="edit" medicineId={id} />;
};
