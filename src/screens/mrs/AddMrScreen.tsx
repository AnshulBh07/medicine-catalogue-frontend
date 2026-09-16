import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { MrForm } from './MrForm';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddMrRouteProp = RouteProp<RootStackParamList, 'AddMr'>;

export interface AddMrScreenProps {
  route?: AddMrRouteProp;
}

export const AddMrScreen: React.FC<AddMrScreenProps> = ({ route: propRoute }) => {
  const navigation = useNavigation<NavigationProp>();
  let hookRoute: AddMrRouteProp | undefined;
  try {
    hookRoute = useRoute<AddMrRouteProp>();
  } catch {
    hookRoute = undefined;
  }
  const route = propRoute || hookRoute;
  const returnDealParams = route?.params?.returnDealParams;

  return (
    <MrForm
      mode="create"
      onSuccess={
        returnDealParams
          ? (mr) => {
              navigation.navigate('AddDeal', {
                createdMrId: mr.id,
              });
            }
          : undefined
      }
    />
  );
};

