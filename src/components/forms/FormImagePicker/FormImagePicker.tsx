import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Chip } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { spacing, borderRadius } from '@/theme/spacing';
import { imageLibraryApi } from '@/services/api';
import { safeImageUri } from '@/utils/imageUrl';

interface FormImagePickerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  multiple?: boolean;
  hint?: string;
}

const getImageUri = (img: any): string | undefined => {
  if (!img) return undefined;
  if (typeof img === 'object' && img.uri) return img.uri;
  return safeImageUri(img);
};

const SOURCE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Products', value: 'PRODUCT' },
  { label: 'Categories', value: 'CATEGORY' },
];

export const FormImagePicker = <T extends FieldValues>({
  name,
  control,
  label,
  multiple = false,
  hint,
}: FormImagePickerProps<T>) => {
  const { colors } = useTheme();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySource, setLibrarySource] = useState('');
  const [pendingOnChange, setPendingOnChange] = useState<((v: any) => void) | null>(null);
  const [pendingValue, setPendingValue] = useState<any>(null);

  const { data: libraryData, isLoading: libraryLoading } = useQuery({
    queryKey: ['imageLibrary', librarySearch, librarySource],
    queryFn: () =>
      imageLibraryApi.getImageLibrary({
        search: librarySearch || undefined,
        source: (librarySource as 'PRODUCT' | 'CATEGORY') || undefined,
        limit: 50,
      }),
    enabled: libraryOpen,
  });

  const pickFromGallery = (onChange: (value: any) => void, currentValue: any) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: multiple ? 0 : 1,
        quality: 0.8,
      },
      response => {
        if (response.didCancel || response.errorCode) return;
        const assets = response.assets;
        if (!assets || assets.length === 0) return;

        const picked = assets.map(asset => ({
          uri: asset.uri!,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
        }));

        if (multiple) {
          const current = Array.isArray(currentValue) ? currentValue : [];
          onChange([...current, ...picked]);
        } else {
          onChange(picked[0]);
        }
      },
    );
  };

  const takePhoto = (onChange: (value: any) => void, currentValue: any) => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      },
      response => {
        if (response.didCancel || response.errorCode) return;
        const assets = response.assets;
        if (!assets || assets.length === 0) return;

        const asset = assets[0];
        const picked = {
          uri: asset.uri!,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        };

        if (multiple) {
          const current = Array.isArray(currentValue) ? currentValue : [];
          onChange([...current, picked]);
        } else {
          onChange(picked);
        }
      },
    );
  };

  const handlePickImage = (onChange: (value: any) => void, currentValue: any) => {
    Alert.alert('Select Image', 'Choose an option', [
      { text: 'Camera', onPress: () => takePhoto(onChange, currentValue) },
      { text: 'Gallery', onPress: () => pickFromGallery(onChange, currentValue) },
      {
        text: 'Pick from Library',
        onPress: () => {
          setPendingOnChange(() => onChange);
          setPendingValue(currentValue);
          setLibraryOpen(true);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLibrarySelect = (url: string) => {
    if (!pendingOnChange) return;
    const existingImages = multiple
      ? (Array.isArray(pendingValue) ? pendingValue : [])
      : (pendingValue ? [pendingValue] : []);
    const existingUrls = existingImages.map((i: any) => getImageUri(i));
    if (existingUrls.includes(url)) {
      Alert.alert('Duplicate', 'This image is already added');
      return;
    }
    if (multiple) {
      const current = Array.isArray(pendingValue) ? pendingValue : [];
      pendingOnChange([...current, url]);
      setPendingValue([...current, url]);
    } else {
      pendingOnChange(url);
      setLibraryOpen(false);
    }
  };

  const handleRemoveImage = (onChange: (value: any) => void, currentValue: any, index?: number) => {
    if (multiple && typeof index === 'number') {
      const currentImages = Array.isArray(currentValue) ? currentValue : [];
      onChange(currentImages.filter((_: any, i: number) => i !== index));
    } else {
      onChange('');
    }
  };

  const libraryImages = libraryData?.data || [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const images = multiple
          ? (Array.isArray(value) ? value : [])
          : (value ? [value] : []);

        return (
          <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>

            {multiple ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.multipleContainer}>
                  {images.map((img: any, index: number) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri: getImageUri(img) }} style={styles.image} />
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: colors.surface.default }]}
                        onPress={() => handleRemoveImage(onChange, value, index)}
                      >
                        <Icon name="close-circle" size={22} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.addButton, { borderColor: colors.border.default }]}
                    onPress={() => handlePickImage(onChange, value)}
                  >
                    <Icon name="plus" size={32} color={colors.neutral[400]} />
                    <Text style={[styles.addButtonText, { color: colors.neutral[400] }]}>Add Image</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View>
                {images.length > 0 ? (
                  <View style={styles.singleImageWrapper}>
                    <Image source={{ uri: getImageUri(images[0]) }} style={styles.singleImage} />
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: colors.surface.default }]}
                      onPress={() => handleRemoveImage(onChange, value)}
                    >
                      <Icon name="close-circle" size={24} color={colors.error.main} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.changeButton}
                      onPress={() => handlePickImage(onChange, value)}
                    >
                      <Icon name="camera" size={20} color={colors.neutral[0]} />
                      <Text style={[styles.changeButtonText, { color: colors.neutral[0] }]}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.pickButton,
                      { backgroundColor: colors.surface.variant, borderColor: colors.border.default },
                      error && { borderColor: colors.error.main },
                    ]}
                    onPress={() => handlePickImage(onChange, value)}
                  >
                    <Icon name="image-plus" size={40} color={colors.neutral[400]} />
                    <Text style={[styles.pickButtonText, { color: colors.text.secondary }]}>Choose Image</Text>
                    {hint && <Text style={[styles.hint, { color: colors.text.tertiary }]}>{hint}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {error && <Text style={[styles.errorText, { color: colors.error.main }]}>{error.message}</Text>}

            {/* Image Library Modal */}
            <Modal visible={libraryOpen} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface.default }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                      Pick from Library
                    </Text>
                    <TouchableOpacity onPress={() => setLibraryOpen(false)}>
                      <Icon name="close" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.librarySearch}>
                    <TextInput
                      style={[styles.searchInput, { borderColor: colors.border.default, color: colors.text.primary }]}
                      placeholder="Search by product or category..."
                      placeholderTextColor={colors.text.tertiary}
                      value={librarySearch}
                      onChangeText={setLibrarySearch}
                    />
                  </View>

                  <View style={styles.sourceFilterRow}>
                    {SOURCE_FILTERS.map((f) => (
                      <Chip
                        key={f.value}
                        selected={librarySource === f.value}
                        onPress={() => setLibrarySource(f.value)}
                        style={{ marginRight: spacing[2] }}
                        compact
                      >
                        {f.label}
                      </Chip>
                    ))}
                  </View>

                  {libraryLoading ? (
                    <View style={styles.libraryLoader}>
                      <ActivityIndicator size="large" color={colors.primary.main} />
                    </View>
                  ) : (
                    <FlatList
                      data={libraryImages}
                      numColumns={3}
                      keyExtractor={(item, i) => `${item.url}-${i}`}
                      contentContainerStyle={styles.libraryGrid}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.libraryItem}
                          onPress={() => handleLibrarySelect(item.url)}
                          activeOpacity={0.7}
                        >
                          <Image source={{ uri: safeImageUri(item.url) || item.url }} style={styles.libraryImage} />
                          <View style={[styles.libraryBadge, {
                            backgroundColor: item.source === 'PRODUCT' ? colors.primary.main : '#10B981',
                          }]}>
                            <Text style={styles.libraryBadgeText}>
                              {item.source === 'PRODUCT' ? 'P' : 'C'}
                            </Text>
                          </View>
                          <Text style={[styles.libraryName, { color: colors.text.secondary }]} numberOfLines={1}>
                            {item.sourceName}
                          </Text>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.libraryEmpty}>
                          <Icon name="image-off-outline" size={40} color={colors.neutral[400]} />
                          <Text style={[styles.libraryEmptyText, { color: colors.text.tertiary }]}>
                            No images found
                          </Text>
                        </View>
                      }
                    />
                  )}

                  {libraryData?.total != null && (
                    <Text style={[styles.libraryCount, { color: colors.text.tertiary }]}>
                      Showing {libraryImages.length} of {libraryData.total}
                    </Text>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  multipleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  singleImageWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  singleImage: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
  },
  changeButton: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
  },
  changeButtonText: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
  pickButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing[2],
  },
  hint: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing[1],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing[6],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  librarySearch: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
    fontSize: 14,
  },
  sourceFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  libraryLoader: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  libraryGrid: {
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[4],
  },
  libraryItem: {
    flex: 1 / 3,
    padding: spacing[1],
    alignItems: 'center',
    position: 'relative',
  },
  libraryImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
  },
  libraryBadge: {
    position: 'absolute',
    top: spacing[1] + 4,
    left: spacing[1] + 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  libraryName: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  libraryEmpty: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  libraryEmptyText: {
    fontSize: 14,
    marginTop: spacing[2],
  },
  libraryCount: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing[2],
  },
});
