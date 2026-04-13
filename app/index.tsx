import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
interface GeoPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  color: string;
  createdAt: string;
}

const PIN_COLORS = ['#00F5A0', '#FF6B6B', '#FFC947', '#74B9FF', '#A29BFE', '#FD79A8'];
const STORAGE_KEY = '@geomarker_pins';

// ─── Custom Map Style (Dark) ──────────────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2530' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#131922' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c677d' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#243040' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d3f55' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#344e6b' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1a3a5c' }] },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  const [pins, setPins] = useState<GeoPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<GeoPin | null>(null);
  const [tempCoord, setTempCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [pinTitle, setPinTitle] = useState('');
  const [pinDesc, setPinDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(PIN_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [region, setRegion] = useState<Region>({
    latitude: -15.7801,
    longitude: -47.9292,
    latitudeDelta: 8,
    longitudeDelta: 8,
  });

  // ── Load pins & location ──────────────────────────────────────────────────
  useEffect(() => {
    loadPins();
    requestLocation();
  }, []);

  const loadPins = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setPins(JSON.parse(raw));
    } catch (e) {
      console.error('Erro ao carregar pins', e);
    }
  };

  const savePins = async (newPins: GeoPin[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPins));
    } catch (e) {
      console.error('Erro ao salvar pins', e);
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 800);
      } catch (e) {
        console.log('Localização não disponível');
      }
    }
    setLoading(false);
  };

  const goToMyLocation = async () => {
    if (!locationGranted) {
      await requestLocation();
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
    }
  };

  // ── Map press → add marker ────────────────────────────────────────────────
  const handleMapPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setTempCoord({ lat: latitude, lng: longitude });
    setPinTitle('');
    setPinDesc('');
    setSelectedColor(PIN_COLORS[0]);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const confirmPin = () => {
    if (!tempCoord) return;
    if (!pinTitle.trim()) {
      Alert.alert('Atenção', 'Dê um nome ao marcador.');
      return;
    }
    const newPin: GeoPin = {
      id: Date.now().toString(),
      latitude: tempCoord.lat,
      longitude: tempCoord.lng,
      title: pinTitle.trim(),
      description: pinDesc.trim(),
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };
    const updated = [...pins, newPin];
    setPins(updated);
    savePins(updated);
    setModalVisible(false);
    setTempCoord(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deletePin = (id: string) => {
    Alert.alert('Excluir marcador', 'Deseja remover este ponto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const updated = pins.filter((p) => p.id !== id);
          setPins(updated);
          savePins(updated);
          setSelectedPin(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        },
      },
    ]);
  };

  const flyToPin = (pin: GeoPin) => {
    mapRef.current?.animateToRegion(
      { latitude: pin.latitude, longitude: pin.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
    setSelectedPin(pin);
    setListVisible(false);
  };

  const formatCoord = (n: number, decimals = 6) => n.toFixed(decimals);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ── Panel animation ───────────────────────────────────────────────────────
  const openPanel = () => {
    setListVisible(true);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
    Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
      setListVisible(false)
    );
    Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const panelTranslate = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapType === 'standard' ? DARK_MAP_STYLE : []}
        mapType={mapType}
        initialRegion={region}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={handleMapPress}
        onLongPress={handleMapPress}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => setSelectedPin(pin === selectedPin ? null : pin)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={[styles.markerOuter, { borderColor: pin.color }]}>
              <View style={[styles.markerInner, { backgroundColor: pin.color }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00F5A0" />
          <Text style={styles.loadingText}>Obtendo localização...</Text>
        </View>
      )}

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.logoChip}>
            <MaterialIcons name="place" size={16} color="#00F5A0" />
            <Text style={styles.logoText}>GeoMarker</Text>
          </View>
          <Text style={styles.pinCount}>{pins.length} ponto{pins.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Map type toggle */}
        <View style={styles.mapTypeRow}>
          {(['standard', 'satellite', 'hybrid'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.mapTypeBtn, mapType === t && styles.mapTypeBtnActive]}
              onPress={() => { setMapType(t); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.mapTypeTxt, mapType === t && styles.mapTypeTxtActive]}>
                {t === 'standard' ? 'Mapa' : t === 'satellite' ? 'Sat' : 'Híb'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* HINT */}
      <View style={styles.hintBar}>
        <Ionicons name="finger-print-outline" size={14} color="#5c677d" />
        <Text style={styles.hintText}>Toque no mapa para adicionar um marcador</Text>
      </View>

      {/* SELECTED PIN INFO */}
      {selectedPin && (
        <Animated.View style={styles.infoCard}>
          <View style={[styles.infoColorDot, { backgroundColor: selectedPin.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{selectedPin.title}</Text>
            {selectedPin.description ? (
              <Text style={styles.infoDesc}>{selectedPin.description}</Text>
            ) : null}
            <Text style={styles.infoCoord}>
              {formatCoord(selectedPin.latitude)}°, {formatCoord(selectedPin.longitude)}°
            </Text>
            <Text style={styles.infoDate}>{formatDate(selectedPin.createdAt)}</Text>
          </View>
          <View style={styles.infoActions}>
            <TouchableOpacity onPress={() => deletePin(selectedPin.id)} style={styles.infoActionBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedPin(null)} style={styles.infoActionBtn}>
              <Ionicons name="close" size={20} color="#8892a4" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* FABs */}
      <Animated.View style={[styles.fabs, { opacity: fabAnim }]}>
        <TouchableOpacity style={styles.fabSecondary} onPress={goToMyLocation}>
          <Ionicons name="locate" size={22} color="#74B9FF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabSecondary} onPress={openPanel}>
          <Ionicons name="list" size={22} color="#A29BFE" />
          {pins.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pins.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── LIST PANEL ──────────────────────────────────────────────────── */}
      {listVisible && (
        <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslate }] }]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Marcadores salvos</Text>
            <TouchableOpacity onPress={closePanel}>
              <Ionicons name="close-circle" size={26} color="#5c677d" />
            </TouchableOpacity>
          </View>

          {pins.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="place" size={48} color="#1e2530" />
              <Text style={styles.emptyText}>Nenhum marcador ainda</Text>
              <Text style={styles.emptySubtext}>Toque no mapa para adicionar</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {pins.map((pin, i) => (
                <TouchableOpacity key={pin.id} style={styles.pinRow} onPress={() => flyToPin(pin)}>
                  <View style={[styles.pinRowDot, { backgroundColor: pin.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinRowTitle}>{pin.title}</Text>
                    <Text style={styles.pinRowCoord}>
                      {formatCoord(pin.latitude, 4)}°, {formatCoord(pin.longitude, 4)}°
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => { closePanel(); setTimeout(() => deletePin(pin.id), 300); }}>
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {/* ── ADD PIN MODAL ──────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Novo Marcador</Text>

            {tempCoord && (
              <View style={styles.coordPreview}>
                <MaterialIcons name="place" size={14} color="#00F5A0" />
                <Text style={styles.coordText}>
                  {formatCoord(tempCoord.lat)}°, {formatCoord(tempCoord.lng)}°
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ponto de referência..."
              placeholderTextColor="#3a4455"
              value={pinTitle}
              onChangeText={setPinTitle}
              maxLength={50}
            />

            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Observações opcionais..."
              placeholderTextColor="#3a4455"
              value={pinDesc}
              onChangeText={setPinDesc}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Cor do marcador</Text>
            <View style={styles.colorRow}>
              {PIN_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSwatchActive]}
                  onPress={() => { setSelectedColor(c); Haptics.selectionAsync(); }}
                />
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setModalVisible(false); setTempCoord(null); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: selectedColor }]} onPress={confirmPin}>
                <Ionicons name="checkmark" size={18} color="#0A0E1A" />
                <Text style={styles.btnConfirmText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#8892a4', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: { gap: 4 },
  logoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10,14,26,0.92)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1e2530',
  },
  logoText: { color: '#e8edf5', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  pinCount: { color: '#5c677d', fontSize: 11, paddingLeft: 4 },

  mapTypeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,14,26,0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e2530',
    overflow: 'hidden',
  },
  mapTypeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  mapTypeBtnActive: { backgroundColor: '#1e2530' },
  mapTypeTxt: { color: '#5c677d', fontSize: 12, fontWeight: '600' },
  mapTypeTxtActive: { color: '#00F5A0' },

  // Hint
  hintBar: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,14,26,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a2133',
  },
  hintText: { color: '#5c677d', fontSize: 12 },

  // Marker
  markerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    backgroundColor: 'rgba(10,14,26,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInner: { width: 12, height: 12, borderRadius: 6 },

  // Info card
  infoCard: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e2530',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  infoColorDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  infoTitle: { color: '#e8edf5', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  infoDesc: { color: '#8892a4', fontSize: 13, marginBottom: 4 },
  infoCoord: { color: '#5c677d', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  infoDate: { color: '#3a4455', fontSize: 10, marginTop: 2 },
  infoActions: { flexDirection: 'column', gap: 8 },
  infoActionBtn: { padding: 4 },

  // FABs
  fabs: {
    position: 'absolute',
    bottom: 48,
    right: 16,
    gap: 12,
    alignItems: 'center',
  },
  fabSecondary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2530',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#00F5A0',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#0A0E1A', fontSize: 9, fontWeight: '700' },

  // Panel
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e2530',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#2d3748',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  panelTitle: { color: '#e8edf5', fontSize: 18, fontWeight: '700' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 60 },
  emptyText: { color: '#3a4455', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#2d3748', fontSize: 13 },

  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2133',
  },
  pinRowDot: { width: 12, height: 12, borderRadius: 6 },
  pinRowTitle: { color: '#e8edf5', fontSize: 15, fontWeight: '600' },
  pinRowCoord: { color: '#5c677d', fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e2530',
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#2d3748',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#e8edf5', fontSize: 20, fontWeight: '700', marginBottom: 16 },

  coordPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,245,160,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,245,160,0.15)',
  },
  coordText: { color: '#00F5A0', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  inputLabel: { color: '#8892a4', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0d1117',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2530',
    color: '#e8edf5',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputMulti: { height: 80 },

  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { transform: [{ scale: 1.25 }], shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 8 },

  modalBtns: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  btnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2530',
    alignItems: 'center',
    backgroundColor: '#0d1117',
  },
  btnCancelText: { color: '#8892a4', fontSize: 15, fontWeight: '600' },
  btnConfirm: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnConfirmText: { color: '#0A0E1A', fontSize: 15, fontWeight: '800' },
});
