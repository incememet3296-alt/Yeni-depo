# Sanal Hayvan

Gerçek dünyayı keşfet, sanal hayvanlarını bul. Pokémon GO mantığında, mobil öncelikli bir artırılmış gerçeklik (AR-benzeri) web uygulaması.

## Projenin Amacı

Kullanıcı telefondan web sitesine girdiğinde canlı kamerayı açar. GPS, pusula ve cihaz yönelim bilgileri kullanılarak gerçek dünyadaki konumlarına göre sanal hayvanları görür. Hayvanlar kamera ekranına yapıştırılmış bir UI görseli gibi değil, gerçek dünyadaki konumlarıyla ilişkili şekilde kullanıcıya doğru yönde ve mesafede gösterilir.

## Kurulum

```bash
npm install
npm run dev      # Geliştirme sunucusu (localhost)
npm run build    # Production build
npm run preview  # Production build önizleme
```

## Kamera İzinleri

Uygulama kamera açıldığında `navigator.mediaDevices.getUserMedia()` ile arka kamerayı (`facingMode: "environment"`) kullanır. İlk açılışta tarayıcı izin ister. İzin reddedilirse kullanıcıya anlaşılır bir mesaj gösterilir.

## GPS İzinleri

`navigator.geolocation.watchPosition()` ile yüksek doğrulukta konum takibi yapılır. İzin reddedilirse uygulama çökmez, kullanıcıya bilgilendirici mesaj gösterilir.

## HTTPS Gereksinimi

Kamera ve GPS API'leri HTTPS gerektirir (localhost hariç). Production'da HTTPS kullanın. HTTP üzerinde kamera açılamaz.

## AR Desteği

Uygulama Web API'leri (kamera + GPS + orientation) tabanlı bir AR-benzeri sistem kullanır. WebXR/ARCore/ARKit kullanılmaz. AR desteklenmeyen cihazlarda "3D Keşif Modu" fallback'i sunulur.

Destek durumları: `supported`, `unsupported`, `checking`, `permission-required`.

## Dosya Yapısı

```
src/
├── app/
│   ├── App.tsx              # Ana uygulama bileşeni + routing
│   └── routes.ts            # Route tanımları
├── components/
│   ├── Camera/
│   │   ├── CameraView.tsx       # Kamera video gösterimi
│   │   ├── CameraPermission.tsx # Kamera izin isteme ekranı
│   │   └── CameraStatus.tsx     # Kamera durum rozeti
│   ├── Animal/
│   │   ├── AnimalCard.tsx        # Hayvan kartı (liste görünümü)
│   │   ├── AnimalMarker.tsx     # Kamera üzerinde hayvan işareti
│   │   └── AnimalInfo.tsx       # Hayvan bilgi modalı
│   ├── UI/
│   │   ├── Button.tsx           # Yeniden kullanılabilir buton
│   │   ├── Modal.tsx            # Modal bileşeni
│   │   └── StatusMessage.tsx    # Durum/hata mesajı
│   └── Layout/
│       ├── Header.tsx           # Sayfa başlığı
│       └── BottomNavigation.tsx # Alt navigasyon barı
├── pages/
│   ├── HomePage.tsx         # Ana sayfa
│   ├── ExplorePage.tsx      # Keşfet sayfası
│   ├── CameraPage.tsx       # Kamera/AR sayfası
│   ├── AnimalsPage.tsx      # Hayvanlarım sayfası
│   └── ProfilePage.tsx      # Profil sayfası
├── lib/
│   ├── camera.ts            # Kamera başlatma/durdurma
│   ├── location.ts          # GPS watchPosition
│   ├── orientation.ts       # DeviceOrientation yönetimi
│   ├── compass.ts           # Pusula yönü hesaplama
│   ├── ar-support.ts        # AR destek kontrolü
│   ├── distance.ts          # İki GPS arası mesafe (Haversine)
│   ├── bearing.ts           # Yön hesaplama
│   └── animal-position.ts  # Hayvan ekran pozisyonu hesaplama
├── data/
│   └── animals.ts           # Mock hayvan verisi
├── types/
│   └── animal.ts            # Animal tipi
├── hooks/
│   ├── useCamera.ts         # Kamera hook
│   ├── useLocation.ts       # GPS hook
│   ├── useOrientation.ts    # Orientation hook
│   └── useArSupport.ts      # AR destek hook
├── styles/
│   └── global.css           # Tüm stiller
└── main.tsx                 # Giriş noktası
```

## Sorumluluk Dağılımı

| Dosya | Sorumluluk |
|-------|-----------|
| `lib/camera.ts` | Kamera başlatma, durdurma, hata yönetimi |
| `lib/location.ts` | GPS izleme, konum verisi |
| `lib/orientation.ts` | Cihaz yönelimi (alpha/beta/gamma) |
| `lib/compass.ts` | Pusula yönü hesaplama |
| `lib/ar-support.ts` | AR destek kontrolü |
| `lib/distance.ts` | İki koordinat arası mesafe |
| `lib/bearing.ts` | Yön (bearing) hesaplama |
| `lib/animal-position.ts` | Hayvanın ekran pozisyonu, görünürlük |
| `hooks/useCamera.ts` | Kamera state yönetimi |
| `hooks/useLocation.ts` | GPS state yönetimi |
| `hooks/useOrientation.ts` | Orientation state + iOS izin |
| `hooks/useArSupport.ts` | AR destek state |
| `pages/CameraPage.tsx` | Kamera + AR deneyimi orkestrasyonu |

## Hata Ayıklama Rehberi

- **Kamera açılmıyor**: HTTPS kullanıldığından emin olun. Tarayıcı konsolunda izin hatası var mı kontrol edin. `lib/camera.ts` hata mesajını döndürür.
- **GPS çalışmıyor**: `lib/location.ts` hata callback'ine bakın. İzin reddedildi mi kontrol edin.
- **Hayvanlar görünmüyor**: `lib/animal-position.ts` içinde `DISCOVERY_RADIUS` (1000m) kontrol edin. Kullanıcı konumu ile hayvan konumu arası mesafe hesaplanır.
- **Pusula çalışmıyor (iOS)**: `hooks/useOrientation.ts` içinde `requestPermission()` çağrılır. iOS 13+ için izin gerekir.
- **Hayvan ekran dışında**: `lib/animal-position.ts` → `getScreenOffset()` fonksiyonu `relativeBearing` ve `fieldOfView` kullanır.

## Test Edilebilir Fonksiyonlar

Aşağıdaki fonksiyonlar saf (pure) fonksiyonlardır ve kolayca test edilebilir:

- `lib/distance.ts` → `calculateDistance(lat1, lon1, lat2, lon2)`
- `lib/bearing.ts` → `calculateBearing(lat1, lon1, lat2, lon2)`
- `lib/animal-position.ts` → `calculateAnimalPosition(animal, user, heading)`
- `lib/animal-position.ts` → `normalizeAngle(angle)`
- `lib/animal-position.ts` → `getScreenOffset(relativeBearing, fov, screenWidth)`
- `lib/animal-position.ts` → `getDistanceScale(distance, maxDistance)`

## Tarayıcı Desteği

- Chrome Android (kamera + GPS + orientation)
- Safari iOS (kamera + GPS + orientation, iOS 13+ için orientation izni gerekir)
- Tablet ve desktop responsive

## Güvenlik

- Kamera verisi sunucuya gönderilmez.
- Konum verisi şimdilik sunucuya gönderilmez.
- API key kullanılmaz.
- Tüm izinler açıkça istenir.
