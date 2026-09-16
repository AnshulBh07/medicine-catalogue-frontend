import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, iconSizes } from '../theme';

export type IconName =
  | 'dashboard'
  | 'dashboard-active'
  | 'handshake'
  | 'bottle'
  | 'alert-triangle'
  | 'medicines'
  | 'medicines-active'
  | 'mr-registry'
  | 'mr-registry-active'
  | 'more'
  | 'more-active'
  | 'manufacturers'
  | 'compositions'
  | 'salts'
  | 'batches'
  | 'users'
  | 'commercial'
  | 'calendar'
  | 'search'
  | 'filter'
  | 'filter-filled'
  | 'add'
  | 'edit'
  | 'delete'
  | 'back'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'close'
  | 'check'
  | 'phone'
  | 'email'
  | 'warning'
  | 'info'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'crown'
  | 'logout'
  | 'refresh'
  | 'person'
  | 'building'
  | 'shield'
  | 'shield-outline'
  | 'time'
  | 'cube'
  | 'pricetag'
  | 'tag'
  | 'sort'
  | 'apps'
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'camera'
  | 'image'
  | 'settings'
  | 'clipboard'
  | 'document-text'
  | 'call'
  | 'plus'
  | 'minus'
  | 'notifications'
  | 'sunny'
  | 'partly-sunny'
  | 'cloudy'
  | 'rainy'
  | 'snow'
  | 'thunderstorm'
  | 'location'
  | 'location-filled'
  | 'leaf'
  | 'arrow-forward'
  | 'list';

const iconMap: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  'alert-triangle': 'warning-outline',
  handshake: 'people-outline',
  bottle: 'medkit-outline',
  dashboard: 'home-outline',
  'dashboard-active': 'home',
  medicines: 'medkit-outline',
  'medicines-active': 'medkit',
  'mr-registry': 'people-outline',
  'mr-registry-active': 'people',
  more: 'grid-outline',
  'more-active': 'grid',
  manufacturers: 'business-outline',
  compositions: 'git-network-outline',
  salts: 'flask-outline',
  batches: 'cube-outline',
  users: 'person-circle-outline',
  commercial: 'pricetag-outline',
  calendar: 'calendar-outline',
  search: 'search-outline',
  filter: 'funnel-outline',
  'filter-filled': 'funnel',
  add: 'add',
  edit: 'create-outline',
  delete: 'trash-outline',
  back: 'arrow-back',
  'chevron-left': 'chevron-back',
  'chevron-right': 'chevron-forward',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',
  close: 'close',
  check: 'checkmark',
  phone: 'call-outline',
  call: 'call',
  email: 'mail-outline',
  warning: 'alert-circle-outline',
  info: 'information-circle-outline',
  lock: 'lock-closed-outline',
  eye: 'eye-outline',
  'eye-off': 'eye-off-outline',
  crown: 'ribbon-outline',
  logout: 'log-out-outline',
  refresh: 'refresh-outline',
  person: 'person-outline',
  building: 'business-outline',
  shield: 'shield-checkmark-outline',
  'shield-outline': 'shield-outline',
  time: 'time-outline',
  cube: 'cube-outline',
  pricetag: 'pricetag-outline',
  tag: 'pricetag-outline',
  sort: 'swap-vertical-outline',
  apps: 'apps-outline',
  tablet: 'disc-outline',
  capsule: 'bandage-outline',
  syrup: 'flask-outline',
  camera: 'camera-outline',
  image: 'image-outline',
  settings: 'settings-outline',
  clipboard: 'clipboard-outline',
  'document-text': 'document-text-outline',
  plus: 'add',
  minus: 'remove',
  notifications: 'notifications-outline',
  sunny: 'sunny-outline',
  'partly-sunny': 'partly-sunny-outline',
  cloudy: 'cloudy-outline',
  rainy: 'rainy-outline',
  snow: 'snow-outline',
  thunderstorm: 'thunderstorm-outline',
  location: 'location-sharp',
  'location-filled': 'location',
  leaf: 'leaf-outline',
  'arrow-forward': 'arrow-forward',
  list: 'list-outline',
};

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | number;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = colors.textPrimary,
  style,
  testID,
}) => {
  const numericSize =
    typeof size === 'number'
      ? size
      : iconSizes[size] ?? iconSizes.md;

  if (name === 'handshake') {
    return (
      <MaterialCommunityIcons
        testID={testID}
        name="handshake"
        size={numericSize}
        color={color}
        style={style}
      />
    );
  }

  if (name === 'bottle') {
    return (
      <MaterialCommunityIcons
        testID={testID}
        name="bottle-tonic-plus-outline"
        size={numericSize}
        color={color}
        style={style}
      />
    );
  }

  const ioniconName = iconMap[name] ?? 'help-outline';

  return (
    <Ionicons
      testID={testID}
      name={ioniconName}
      size={numericSize}
      color={color}
      style={style}
    />
  );
};
