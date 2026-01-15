import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Camera, RotateCcw, FileText, MessageSquare, Send, Map, MapPin, CheckCircle, SwitchCamera, Check, Car, Truck, Bike, Activity, Footprints } from 'lucide-react';
import { colors, glass, borderRadius, shadows, transitions, buttons, inputs } from '../designSystem';
import config from "../config";
import { useAlert } from './AlertContext';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

function FormLapor() {
  const [coords, setCoords] = useState(null);
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const { showAlert } = useAlert();
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // New Fields State
  const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default 16:9 for modern look
  const [damageType, setDamageType] = useState("");
  const [damageSeverity, setDamageSeverity] = useState("");
  const [trafficImpact, setTrafficImpact] = useState("");
  const [impactedVehicles, setImpactedVehicles] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);

  // Options Constants
  const DAMAGE_TYPES = [
    "Jalan berlubang", "Retak memanjang", "Retak melebar", "Aspal terkelupas",
    "Jalan amblas", "Jalan bergelombang", "Tergenang air", "Longsor kecil",
    "Marka jalan rusak", "Bahu jalan rusak"
  ];

  const SEVERITY_LEVELS = ["Ringan", "Sedang", "Berat"];

  const TRAFFIC_IMPACTS = [
    { value: "Tidak Menghambat", desc: "Jalan masih bisa dilewati normal" },
    { value: "Hambatan Ringan", desc: "Kendaraan melambat, masih bisa dua arah" },
    { value: "Hambatan Sedang", desc: "Sebagian jalan tertutup, antrean pendek" },
    { value: "Hambatan Berat", desc: "Macet parah, jalur tersisa sangat sempit" },
    { value: "Jalan Tertutup Total", desc: "Tidak bisa dilewati sama sekali" }
  ];

  const VEHICLE_TYPES = [
    "Sepeda Motor", "Mobil Pribadi", "Angkutan Umum",
    "Truk / Kendaraan Berat", "Kendaraan Darurat", "Pejalan Kaki", "Pesepeda"
  ];

  const webcamRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => showAlert("Gagal mengambil lokasi GPS. Pastikan izin lokasi aktif.", "error"),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
  }, [webcamRef]);

  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);

  // Detect available cameras on mount
  const handleDevices = useCallback(
    (mediaDevices) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
      setDevices(videoDevices);

      // Attempt to find back camera as default if available, else first device
      if (videoDevices.length > 0 && !activeDeviceId) {
        // Try to find a back camera first for "environment" default
        const backCamera = videoDevices.find(device => device.label?.toLowerCase().includes('back') || device.label?.toLowerCase().includes('belakang'));
        setActiveDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
      }
    },
    [activeDeviceId]
  );

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices);
  }, [handleDevices]);

  const toggleCamera = useCallback(() => {
    if (devices.length > 0) {
      // Find current index
      const currentIndex = devices.findIndex(device => device.deviceId === activeDeviceId);
      // Next index (cycle)
      const nextIndex = (currentIndex + 1) % devices.length;
      setActiveDeviceId(devices[nextIndex].deviceId);

      // Reset zoom when switching cameras
      setZoom(1);
    }
  }, [devices, activeDeviceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coords || !image) return showAlert("Foto dan Lokasi GPS wajib ada!", "error");

    setIsSubmitting(true);
    try {
      const blob = await (await fetch(image)).blob();
      const formData = new FormData();
      formData.append('title', damageType || "Laporan Kerusakan Jalan");
      formData.append('description', description);
      formData.append('latitude', coords.lat);
      formData.append('longitude', coords.lng);
      formData.append('damageType', damageType);
      formData.append('damageSeverity', damageSeverity);
      formData.append('trafficImpact', trafficImpact);
      formData.append('impactedVehicles', JSON.stringify(impactedVehicles));
      formData.append('photo', blob, 'jalan-rusak.jpg');

      const token = localStorage.getItem('token');
      await axios.post(`${config.apiUrl}/api/reports`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      showAlert("Laporan berhasil dikirim! Terima kasih atas kontribusi Anda.", "success");

      // Reset form
      setImage(null);
      setDescription("");
      setDamageType("");
      setDamageSeverity("");
      setTrafficImpact("");
      setImpactedVehicles([]);
    } catch (err) {
      showAlert("Gagal mengirim laporan. " + (err.response?.data?.message || "Coba lagi nanti."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles - Dark Theme Refactor
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: isMobile ? '10px' : '20px',
    color: '#ffffff',
    paddingTop: isMobile ? '80px' : '20px',
  };

  const darkGlassCard = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.xl,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  };

  const mainGridStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: '100%',
  };

  const leftColumnStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: isMobile ? '16px' : '24px',
    width: '100%',
  };

  const rightColumnStyle = {
    width: '100%',
    ...darkGlassCard,
    padding: isMobile ? '20px' : '32px',
  };

  // Components specifically for Left Column
  const evidenceCardStyle = {
    ...darkGlassCard,
    padding: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const cameraViewStyle = {
    width: '100%',
    aspectRatio: `${aspectRatio}`, // Dynamic aspect ratio
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    background: '#000',
    position: 'relative',
    boxShadow: shadows.lg,
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s ease', // Smooth transition
  };

  // ... (scannerOverlay, cornerStyle kept)

  const scannerOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
  };

  const ratioContainerStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '8px',
    zIndex: 20,
    pointerEvents: 'auto',
  };

  const ratioButtonStyle = (active) => ({
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: active ? colors.primary : 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s',
  });

  const cornerStyle = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.primary}`,
    animation: 'pulse 2s ease-in-out infinite',
  };

  const inputBaseStyle = {
    width: '100%',
    padding: '16px 20px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    outline: 'none',
    color: '#fff',
    transition: 'all 0.3s ease',
  };

  const selectStyle = (fieldName) => ({
    ...inputBaseStyle,
    cursor: 'pointer',
    borderColor: focusedField === fieldName ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
  });

  const checkboxGroupStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '8px'
  };

  const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: transitions.fast,
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  };

  // ... (radioGroup, buttonGroup)

  const radioGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  };

  const buttonGroupStyle = {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  };

  // Buttons - Update to solid colors or glass
  const captureButtonStyle = {
    ...buttons.primary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 32px',
    borderRadius: '50px', // Pill shape matching Auth
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
    color: '#fff',
  };

  const retakeButtonStyle = {
    ...buttons.secondary,
    background: 'rgba(0,0,0,0.7)', // Darker background for visibility
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 32px',
  };

  const switchButtonStyle = {
    ...buttons.secondary,
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
  };

  // ... (mapTitleStyle, mapContainerStyle, etc)

  // ... (inside the component body)

  const toggleCamera = useCallback(() => {
    // If we have multiple distinct video devices, cycle through them
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(device => device.deviceId === activeDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setActiveDeviceId(devices[nextIndex].deviceId);
      setZoom(1); // Reset zoom
    } else {
      // Fallback: Just toggle facing mode if devices aren't enumerated clearly
      setFacingMode(prev => prev === "user" ? "environment" : "user");
      setActiveDeviceId(null); // Ensure we use facingMode constraint
      setZoom(1);
    }
  }, [devices, activeDeviceId]);

  // ... (in render)

  {/* iPhone-style Zoom Buttons */ }
  {
    zoomSupported && !image && (
      <div style={{
        position: 'absolute',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        zIndex: 20,
        background: 'rgba(0,0,0,0.3)',
        padding: '6px 12px',
        borderRadius: '24px',
        backdropFilter: 'blur(4px)',
      }}>
        {[1, 2, 5].filter(z => z <= maxZoom && z >= minZoom).map(zoomLevel => (
          <button
            key={zoomLevel}
            onClick={(e) => {
              e.preventDefault();
              setZoom(zoomLevel);
              const track = webcamRef.current.stream.getVideoTracks()[0];
              track.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
            }}
            style={{
              background: zoom === zoomLevel ? colors.primary : 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: zoom === zoomLevel ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {zoomLevel}x
          </button>
        ))}
      </div>
    )
  }

  const mapTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const mapContainerStyle = {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    boxShadow: shadows.md,
    minHeight: '300px',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  const formTitleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: '20px',
  };

  const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const inputStyle = (fieldName) => ({
    ...inputBaseStyle,
    borderColor: focusedField === fieldName ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
  });

  const textareaStyle = (fieldName) => ({
    ...inputBaseStyle,
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
    borderColor: focusedField === fieldName ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
  });

  const submitButtonStyle = {
    ...buttons.primary,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '24px',
    borderRadius: '50px',
    opacity: (!image || !coords || isSubmitting) ? 0.5 : 1,
    cursor: (!image || !coords || isSubmitting) ? 'not-allowed' : 'pointer',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
    color: '#fff',
  };

  const successMessageStyle = {
    ...darkGlassCard,
    background: 'rgba(52, 199, 89, 0.2)', // More visible success green
    border: `1px solid ${colors.success}`,
    padding: '16px 24px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: colors.success,
    fontWeight: '600',
    animation: 'slideDown 0.4s ease-out',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px',
  };

  const pageTitleStyle = {
    fontSize: isMobile ? '32px' : '56px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #fff 0%, #3b82f6 50%, #2563eb 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '16px',
    letterSpacing: isMobile ? '-1px' : '-2px',
    filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.3))',
  };

  const pageSubtitleStyle = {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.6)',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    letterSpacing: '0.5px',
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @media (max-width: 968px) {
            .left-column {
              grid-template-columns: 1fr !important;
            }
          }
          
          /* Force Dark Options */
          select option {
            background-color: #1a1a1a !important;
            color: #fff !important;
          }
        `}
      </style>

      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '24px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
            }}>
              <Map size={40} color="#3b82f6" />
            </div>
          </div>
          <h1 style={pageTitleStyle}>Lapor Kerusakan Jalan</h1>
          <div style={{
            width: '80px',
            height: '4px',
            background: 'linear-gradient(to right, transparent, #3b82f6, transparent)',
            margin: '20px auto',
            borderRadius: '2px',
          }} />
          <p style={pageSubtitleStyle}>Bantu kami memetakan infrastruktur yang butuh perbaikan untuk perjalanan yang lebih aman</p>
        </div>

        {/* New Guide Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {[
            { icon: Camera, title: '1. Ambil Foto', desc: 'Foto jalan rusak dengan jelas.' },
            { icon: MapPin, title: '2. Lokasi Otomatis', desc: 'GPS akan mendeteksi lokasi Anda.' },
            { icon: FileText, title: '3. Isi Detail', desc: 'Lengkapi data kerusakan jalan.' }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{
                background: 'rgba(37, 99, 235, 0.2)',
                padding: '12px',
                borderRadius: '12px',
                color: colors.primary
              }}>
                <item.icon size={24} />
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px', fontWeight: '600' }}>{item.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>



        <div style={mainGridStyle} className="main-grid">

          {/* LEFT COLUMN: Visual Evidence (Camera + Map) */}
          <div style={leftColumnStyle} className="left-column">

            {/* Camera Section */}
            <div style={evidenceCardStyle}>
              <div style={mapTitleStyle}>
                <Camera size={20} color={colors.primary} />
                Bukti Foto
              </div>

              <div style={cameraViewStyle}>
                {image ? (
                  <img src={image} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width="100%"
                      height="100%"
                      mirrored={false}
                      videoConstraints={{
                        deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined,
                        facingMode: activeDeviceId ? undefined : facingMode, // Fallback
                        aspectRatio
                      }}
                      style={{ objectFit: 'cover' }}
                      onUserMedia={(stream) => {
                        // Check for zoom capabilities
                        const track = stream.getVideoTracks()[0];
                        const capabilities = track.getCapabilities();
                        if (capabilities.zoom) {
                          setZoomSupported(true);
                          setMaxZoom(capabilities.zoom.max);
                          setMinZoom(capabilities.zoom.min);
                          setZoom(capabilities.zoom.min); // Reset to min
                        } else {
                          setZoomSupported(false);
                        }
                      }}
                    />

                    {/* Manual Zoom Slider */}
                    {zoomSupported && !image && (
                      <div style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>1x</span>
                        <input
                          type="range"
                          min={minZoom}
                          max={maxZoom}
                          step="0.1"
                          value={zoom}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setZoom(val);
                            const track = webcamRef.current.stream.getVideoTracks()[0];
                            track.applyConstraints({ advanced: [{ zoom: val }] });
                          }}
                          style={{
                            width: '100%',
                            accentColor: colors.primary
                          }}
                        />
                        <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{maxZoom}x</span>
                      </div>
                    )}


                    {/* Ratio Controls */}
                    <div style={ratioContainerStyle}>
                      <button
                        onClick={() => setAspectRatio(4 / 3)}
                        style={ratioButtonStyle(aspectRatio === 4 / 3)}
                      >
                        4:3
                      </button>
                      <button
                        onClick={() => setAspectRatio(16 / 9)}
                        style={ratioButtonStyle(aspectRatio === 16 / 9)}
                      >
                        16:9
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div style={buttonGroupStyle}>
                {image ? (
                  <button onClick={() => setImage(null)} style={{ ...retakeButtonStyle, width: '100%', justifyContent: 'center' }}>
                    <RotateCcw size={20} />
                    Foto Ulang
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button onClick={toggleCamera}
                      style={{
                        ...switchButtonStyle,
                        flex: 1,
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.7)', // Darker background for visibility
                        borderColor: 'rgba(255,255,255,0.3)'
                      }}
                      title="Ganti Kamera"
                    >
                      <SwitchCamera size={20} />
                    </button>
                    <button onClick={capture} style={{ ...captureButtonStyle, flex: 2, justifyContent: 'center' }}>
                      <Camera size={20} />
                      Ambil Foto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            <div style={evidenceCardStyle}>
              <div style={mapTitleStyle}>
                <MapPin size={20} color={colors.primary} />
                Lokasi GPS
              </div>
              <div style={mapContainerStyle}>
                {coords ? (
                  <MapContainer center={[coords.lat, coords.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[coords.lat, coords.lng]}>
                      <Popup>Lokasi Kejadian</Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSecondary }}>
                    <div style={{ textAlign: 'center' }}>
                      <MapPin size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p>Mencari lokasi GPS...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Form Details */}
          <div style={rightColumnStyle}>
            <h3 style={formTitleStyle}>
              <FileText size={28} />
              Detail Laporan
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={formGridStyle}>
                {/* New Structured Fields */}
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Kategori Kerusakan</label>
                  <select
                    value={damageType}
                    onChange={e => setDamageType(e.target.value)}
                    onFocus={() => setFocusedField('damageType')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={selectStyle('damageType')}
                  >
                    <option value="">Pilih Kategori</option>
                    {DAMAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Tingkat Kerusakan</label>
                  <select
                    value={damageSeverity}
                    onChange={e => setDamageSeverity(e.target.value)}
                    required
                    style={selectStyle('damageSeverity')}
                  >
                    <option value="">Pilih Tingkat Kerusakan</option>
                    {SEVERITY_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Dampak Lalu Lintas</label>
                  <div style={radioGroupStyle}>
                    {TRAFFIC_IMPACTS.map(item => (
                      <label key={item.value} style={{ ...checkboxLabelStyle, background: trafficImpact === item.value ? 'rgba(74, 144, 226, 0.15)' : checkboxLabelStyle.background }}>
                        <input
                          type="radio"
                          name="trafficImpact"
                          value={item.value}
                          checked={trafficImpact === item.value}
                          onChange={e => setTrafficImpact(e.target.value)}
                          style={{ accentColor: colors.primary }}
                        />
                        <div>
                          <strong>{item.value}</strong>
                          <div style={{ fontSize: '12px', opacity: 0.7 }}>{item.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Kendaraan Terdampak</label>
                  <div style={checkboxGroupStyle}>
                    {VEHICLE_TYPES.map(vehicle => {
                      const isSelected = impactedVehicles.includes(vehicle);

                      return (
                        <div
                          key={vehicle}
                          onClick={() => {
                            if (isSelected) setImpactedVehicles(impactedVehicles.filter(v => v !== vehicle));
                            else setImpactedVehicles([...impactedVehicles, vehicle]);
                          }}
                          style={{
                            ...checkboxLabelStyle,
                            border: isSelected ? `1px solid ${colors.primary}` : '1px solid rgba(255,255,255,0.1)',
                            background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                            boxShadow: isSelected ? '0 0 15px rgba(37, 99, 235, 0.3)' : 'none',
                            justifyContent: 'center', // Center text
                            textAlign: 'center',
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? '600' : 'normal' }}>{vehicle}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>
                    <MessageSquare size={16} />
                    Deskripsi Detail (Opsional)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Jelaskan kondisi kerusakan jalan secara detail jika diperlukan..."
                    style={textareaStyle('description')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!image || !coords || isSubmitting}
                style={submitButtonStyle}
              >
                <Send size={20} />
                <span>{isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan'}</span>
              </button>
            </form>
          </div>
        </div >
      </div >
    </>
  );
}

export default FormLapor;