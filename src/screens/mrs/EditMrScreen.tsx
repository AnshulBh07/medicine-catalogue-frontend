import React from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MrForm } from './MrForm';
import type { RootStackParamList } from '../../types/navigation';

type EditMrRouteProp = RouteProp<RootStackParamList, 'EditMr'>;

export const EditMrScreen: React.FC = () => {
  const route = useRoute<EditMrRouteProp>();
  const { id } = route.params;

  return <MrForm mode="edit" mrId={id} />;
};
