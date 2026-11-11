import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { RECEIPT_MAX_BYTES } from '@paipai/shared/settings';
import { useSnackbar } from '@/components/snackbar';
import { Label, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { useUploadsEnabled } from '@/lib/queries';
import { useTheme } from '@/theme/theme';

/** Pick or shoot an image and upload it through a presigned URL. */
export async function pickAndUpload(
  source: 'camera' | 'library',
  kind: 'receipt' | 'avatar',
): Promise<string | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted)
    throw new Error(
      source === 'camera' ? 'Camera permission is needed' : 'Photo library permission is needed',
    );
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.6,
    allowsEditing: kind === 'avatar',
    aspect: kind === 'avatar' ? [1, 1] : undefined,
  };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const blob = await (await fetch(asset.uri)).blob();
  if (blob.size > RECEIPT_MAX_BYTES) throw new Error('Image must be under 5 MB');
  const contentType = (
    ['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(asset.mimeType ?? '')
      ? asset.mimeType
      : 'image/jpeg'
  ) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';
  const { uploadUrl, publicUrl, headers } = await api.presignUpload({
    kind,
    contentType,
    size: blob.size,
  });
  const put = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
  if (!put.ok) throw new Error('Upload failed');
  return publicUrl;
}

/** Receipt attachment row for Quick Add; hidden when storage isn't configured. */
export function ReceiptPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const enabled = useUploadsEnabled();
  const { colors } = useTheme();
  const snack = useSnackbar();
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  const run = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const url = await pickAndUpload(source, 'receipt');
      if (url) onChange(url);
    } catch (e) {
      snack({ message: (e as Error).message || 'Could not attach the receipt', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mt-4">
      <Label>Receipt photo</Label>
      {value ? (
        <View className="flex-row items-center gap-3">
          <Image
            source={{ uri: value }}
            style={{ width: 64, height: 64, borderRadius: 12 }}
            accessibilityLabel="Receipt photo"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove receipt"
            onPress={() => onChange(null)}
            className="h-11 flex-row items-center gap-1 px-2"
          >
            <X size={16} color={colors.expense} />
            <Text className="text-sm text-expense">Remove</Text>
          </Pressable>
        </View>
      ) : busy ? (
        <ActivityIndicator className="self-start py-3" />
      ) : (
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => void run('camera')}
            className="h-11 flex-row items-center gap-2 rounded-full border border-border px-4"
          >
            <Camera size={16} color={colors.text} />
            <Text weight="medium" className="text-sm">
              Camera
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void run('library')}
            className="h-11 flex-row items-center gap-2 rounded-full border border-border px-4"
          >
            <ImageIcon size={16} color={colors.text} />
            <Text weight="medium" className="text-sm">
              Gallery
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
