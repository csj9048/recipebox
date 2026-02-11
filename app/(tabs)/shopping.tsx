import * as Localization from 'expo-localization';

// ... existing imports

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  // ... existing state

  // Check if user is in Korea
  const isKorea = Localization.getLocales()[0]?.regionCode === 'KR';

  // ... existing fetchItems, etc.

  const handleCoupangSearch = (text: string) => {
    // Open Coupang search.
    // In the future, this can be replaced with a Partners link.
    const url = `https://m.coupang.com/nm/search?q=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };


  // ... inside renderItem

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <TouchableOpacity
      style={[styles.item, item.is_completed && styles.itemCompleted]}
      onPress={() => handleToggleComplete(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
        {/* ... checkbox and text ... */}
        <Ionicons
          name={item.is_completed ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.is_completed ? Colors.gray[400] : Colors.primary}
          style={{ marginRight: 12 }}
        />
        <Text style={[styles.itemText, item.is_completed && styles.itemTextCompleted]} numberOfLines={1}>
          {item.text}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Coupang Search Button (KR only) */}
        {isKorea && !item.is_completed && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: '#E6F0FD' }]} // Light blue bg for distinction
            onPress={() => handleCoupangSearch(item.text)}
          >
            {/* Using a cart icon or search icon. "C" textual icon might be confusing without a logo image. 
                 Let's use a search icon with a distinct color or label if possible, but icon is cleaner.
                 Let's use 'search' or 'cart' with a specific color (Coupang Red/Blueish).
                 Actually, the user suggested "Coupang icon". Since I don't have a custom asset yet, 
                 I'll use a search icon tinted with Coupang's branding color (Red #AE0000) or just a generic search.
                 Let's use a simple link/cart icon with a different color. 
              */}
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#AE0000' }}>C</Text>
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.gray[400]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // ... rest of the component
}

const styles = StyleSheet.create({
  // ...
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: Colors.gray[100], // Optional: distinct background
  },
  // ...
});
