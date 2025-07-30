import React, { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
const MAPS_API_KEY = "AIzaSyAVEKGP04H-YcGd7RjjntkyOYSR0n8ty8o";
const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "1rem",
};
const defaultCenter = { lat: 19.432608, lng: -99.133209 }; // CDMX por defecto

// Hook para obtener la ubicación actual del usuario
function useCurrentLocation() {
  const [location, setLocation] = useState(null);
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => setLocation(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);
  return location;
}

import "./App.css";

const images = [
  "IMG-20250729-WA0075.jpg",
  "IMG-20250729-WA0076.jpg",
  "IMG-20250729-WA0077.jpg",
  "IMG-20250729-WA0078.jpg",
  "IMG-20250729-WA0079.jpg",
  "IMG-20250729-WA0080.jpg",
  "IMG-20250729-WA0081.jpg",
  "IMG-20250729-WA0082.jpg",
  "IMG-20250729-WA0083.jpg",
];

const messages = [
  "Feliz día de la novia, mi amor ❤️",
  "Gracias por estar siempre a mi lado",
  "Eres la persona más especial de mi vida",
  "Cada momento contigo es único",
  "Te amo más de lo que las palabras pueden decir",
  "Hoy celebramos nuestro amor",
  "¡Eres mi felicidad!",
  "Siempre juntos, pase lo que pase",
  "¡Feliz día, princesa! 💖",
];

// Funciones Supabase CRUD y subida de imágenes
async function uploadImageToSupabase(file) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 8)}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from("timeline-images")
    .upload(fileName, file);
  if (error) throw error;
  const { data: publicUrlData } = supabase.storage
    .from("timeline-images")
    .getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}

async function fetchTimeline() {
  let { data, error } = await supabase
    .from("timeline")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function addTimelineItem(item) {
  const { data, error } = await supabase.from("timeline").insert([item]);
  if (error) throw error;
  return data;
}

async function updateTimelineItem(id, item) {
  const { data, error } = await supabase
    .from("timeline")
    .update(item)
    .eq("id", id);
  if (error) throw error;
  return data;
}

async function deleteTimelineItem(id) {
  const { error } = await supabase.from("timeline").delete().eq("id", id);
  if (error) throw error;
}

const App = () => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: MAPS_API_KEY });
  const [index, setIndex] = useState(0);
  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  // Estado para el modal y formulario
  const [showModal, setShowModal] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [errorTimeline, setErrorTimeline] = useState("");
  // Cargar la línea de tiempo desde Supabase al iniciar
  useEffect(() => {
    setLoadingTimeline(true);
    fetchTimeline()
      .then((data) => {
        setTimeline(data || []);
        setLoadingTimeline(false);
      })
      .catch((err) => {
        setErrorTimeline("Error al cargar la línea de tiempo");
        setLoadingTimeline(false);
      });
  }, []);
  const fileInput = useRef(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    place: "",
    date: "",
    time: "",
    images: [],
    coverIndex: 0,
  });

  // Estado para mapa de agregar
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const currentLocation = useCurrentLocation();

  // Estado y funciones para editar
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    place: "",
    date: "",
    time: "",
    images: [],
    coverIndex: 0,
  });

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const readers = files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          })
      );
      Promise.all(readers).then((images) => {
        setEditForm((f) => ({
          ...f,
          images: [...(f.images || []), ...images],
        }));
      });
    }
  };

  // Eliminar imagen individual en edición
  const handleRemoveEditImage = (idx) => {
    setEditForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
    }));
  };

  // Editar nota en Supabase
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      // Subir imágenes nuevas (solo las que son File)
      let imgs = [];
      for (let img of editForm.images) {
        if (typeof img === "string" && img.startsWith("http")) {
          imgs.push(img);
        } else if (img instanceof File) {
          const url = await uploadImageToSupabase(img);
          imgs.push(url);
        } else if (typeof img === "string" && img.startsWith("data:")) {
          // Convertir base64 a File
          const res = await fetch(img);
          const blob = await res.blob();
          const file = new File([blob], `img-${Date.now()}.jpg`, {
            type: blob.type,
          });
          const url = await uploadImageToSupabase(file);
          imgs.push(url);
        }
      }
      const item = {
        ...editForm,
        images: imgs,
        coverIndex: editForm.coverIndex,
      };
      await updateTimelineItem(editForm.id, item);
      // Refrescar
      const data = await fetchTimeline();
      setTimeline(data || []);
      setShowEditModal(false);
    } catch (err) {
      setEditError("Error al guardar cambios");
    }
    setEditLoading(false);
  };

  // Modal para ver foto y descripción en grande
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  // Estado para confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState(null);

  // Eliminar nota en Supabase
  const handleDelete = (idx) => {
    setDeleteIdx(idx);
    setShowDeleteModal(true);
  };
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const confirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const id = timeline[deleteIdx].id;
      await deleteTimelineItem(id);
      const data = await fetchTimeline();
      setTimeline(data || []);
      setShowDeleteModal(false);
      setDeleteIdx(null);
    } catch (err) {
      setDeleteError("Error al eliminar");
    }
    setDeleteLoading(false);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteIdx(null);
  };

  // Formatear hora a 12 horas AM/PM
  function formatTime12h(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${m} ${ampm}`;
  }

  // Estado y funciones para mapa en edición
  const [showEditMap, setShowEditMap] = useState(false);
  const [editSelected, setEditSelected] = useState(null);
  const [loadingEditAddress, setLoadingEditAddress] = useState(false);
  const [editAddressError, setEditAddressError] = useState("");
  const editCurrentLocation = useCurrentLocation();

  // Convertir dirección a coordenadas (geocoding)
  async function getLatLngFromAddress(address) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        return data.results[0].geometry.location;
      }
    } catch (e) {}
    return null;
  }

  // Al abrir el modal de editar, si hay dirección, obtener coordenadas
  function handleOpenEdit(idx, item) {
    setEditIndex(idx);
    setEditForm({ ...item });
    setShowEditModal(true);
    setEditSelected(null);
    if (item.place) {
      getLatLngFromAddress(item.place).then((coords) => {
        if (coords) setEditSelected(coords);
      });
    }
  }

  // Obtener dirección para edición
  const getEditAddressFromLatLng = async (lat, lng) => {
    setLoadingEditAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        setEditForm((f) => ({
          ...f,
          place: data.results[0].formatted_address,
        }));
      }
    } catch (e) {
      setEditForm((f) => ({ ...f, place: "" }));
    }
    setLoadingEditAddress(false);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Obtener dirección a partir de coordenadas
  const getAddressFromLatLng = async (lat, lng) => {
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results && data.results[0]) {
        setForm((f) => ({ ...f, place: data.results[0].formatted_address }));
      }
    } catch (e) {
      setForm((f) => ({ ...f, place: "" }));
    }
    setLoadingAddress(false);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const readers = files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          })
      );
      Promise.all(readers).then((images) => {
        setForm((f) => ({
          ...f,
          images: [...(f.images || []), ...images],
          coverIndex: f.images && f.images.length > 0 ? f.coverIndex : 0,
        }));
      });
    }
  };

  // Eliminar imagen individual en agregar
  // (Eliminada declaración duplicada de handleRemoveFormImage)
  // Eliminar imagen individual en agregar
  const handleRemoveFormImage = (idx) => {
    setForm((f) => {
      let newImages = f.images.filter((_, i) => i !== idx);
      let newCover = f.coverIndex;
      if (newImages.length === 0) newCover = 0;
      else if (idx === f.coverIndex) newCover = 0;
      else if (idx < f.coverIndex) newCover = f.coverIndex - 1;
      return { ...f, images: newImages, coverIndex: newCover };
    });
  };

  // Agregar nota en Supabase
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      // Subir imágenes
      let imgs = [];
      for (let img of form.images) {
        if (img instanceof File) {
          const url = await uploadImageToSupabase(img);
          imgs.push(url);
        } else if (typeof img === "string" && img.startsWith("data:")) {
          // Convertir base64 a File
          const res = await fetch(img);
          const blob = await res.blob();
          const file = new File([blob], `img-${Date.now()}.jpg`, {
            type: blob.type,
          });
          const url = await uploadImageToSupabase(file);
          imgs.push(url);
        } else if (typeof img === "string" && img.startsWith("http")) {
          imgs.push(img);
        }
      }
      const newItem = {
        ...form,
        images: imgs,
        coverIndex: form.coverIndex,
      };
      await addTimelineItem(newItem);
      const data = await fetchTimeline();
      setTimeline(data || []);
      setShowModal(false);
      setForm({
        title: "",
        description: "",
        place: "",
        date: "",
        time: "",
        images: [],
        coverIndex: 0,
      });
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setAddError("Error al guardar");
    }
    setAddLoading(false);
  };

  return (
    <div className="container">
      <h1 className="title animate">{messages[index]}</h1>
      <div className="image-wrapper animate">
        <img
          src={`/src/assets/${images[index]}`}
          alt="Foto especial"
          className="photo"
        />
      </div>
      <div className="controls">
        <button onClick={prev} className="btn">
          Anterior
        </button>
        <button onClick={next} className="btn">
          Siguiente
        </button>
      </div>
      <p className="footer">Con mucho amor 💕</p>
      {/* Botón para abrir el modal */}
      <div style={{ marginTop: 40 }}>
        <button
          className="btn"
          onClick={() => {
            setShowModal(true);
            setSelected(null);
          }}
        >
          Agregar a línea de tiempo
        </button>
      </div>
      {/* Modal para agregar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Agregar a la línea de tiempo</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Título"
                value={form.title}
                onChange={handleFormChange}
                required
              />
              <input
                type="text"
                name="description"
                placeholder="Descripción"
                value={form.description}
                onChange={handleFormChange}
                required
              />
              <div style={{ width: "100%" }}>
                <input
                  type="text"
                  name="place"
                  placeholder="Lugar (puedes escribir o seleccionar en el mapa)"
                  value={form.place}
                  onFocus={() => setShowMap(true)}
                  onChange={handleFormChange}
                  required
                  style={{
                    cursor: "pointer",
                    background: showMap ? "#f8f8f8" : "#fff",
                  }}
                />
                {showMap && (
                  <div style={{ margin: "1rem 0" }}>
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={selected || currentLocation || defaultCenter}
                        zoom={selected || currentLocation ? 16 : 5}
                        onClick={async (e) => {
                          const lat = e.latLng && e.latLng.lat();
                          const lng = e.latLng && e.latLng.lng();
                          if (lat && lng) {
                            setSelected({ lat, lng });
                            setAddressError("");
                            setLoadingAddress(true);
                            try {
                              // Llamada directa a la API para obtener la dirección
                              const response = await fetch(
                                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_API_KEY}`
                              );
                              const data = await response.json();
                              if (data.results && data.results[0]) {
                                const address =
                                  data.results[0].formatted_address;
                                setForm((f) => ({ ...f, place: address }));
                                setAddressError("");
                              } else {
                                setForm((f) => ({ ...f, place: "" }));
                                setAddressError(
                                  "No se pudo obtener la dirección."
                                );
                              }
                            } catch {
                              setForm((f) => ({ ...f, place: "" }));
                              setAddressError(
                                "No se pudo obtener la dirección."
                              );
                            }
                            setLoadingAddress(false);
                          }
                        }}
                      >
                        {selected && <Marker position={selected} />}
                      </GoogleMap>
                    ) : (
                      <div>Cargando mapa...</div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Dirección seleccionada"
                        value={form.place}
                        name="place"
                        readOnly
                        style={{ width: "100%", marginBottom: 8 }}
                      />
                      {loadingAddress && <div>Obteniendo dirección...</div>}
                      {addressError && (
                        <div style={{ color: "#d72660", fontWeight: "bold" }}>
                          {addressError}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setShowMap(false);
                        }}
                        style={{ marginLeft: 0 }}
                      >
                        Usar este lugar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          setShowMap(false);
                          setSelected(null);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleFormChange}
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInput}
                required
                multiple
              />
              {/* Previsualización de imágenes */}
              {form.images && form.images.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    margin: "10px 0",
                  }}
                >
                  {form.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        src={img}
                        alt="preview"
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: 8,
                          border:
                            form.coverIndex === idx
                              ? "2px solid #d72660"
                              : "2px solid transparent",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setForm((f) => ({ ...f, coverIndex: idx }))
                        }
                        title={
                          form.coverIndex === idx ? "Portada" : "Hacer portada"
                        }
                      />
                      {form.coverIndex === idx && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: -18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#d72660",
                            color: "#fff",
                            borderRadius: 6,
                            fontSize: 10,
                            padding: "2px 6px",
                          }}
                        >
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFormImage(idx)}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "#d72660",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        title="Eliminar imagen"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <button className="btn" type="submit">
                  Guardar
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelected(null);
                  }}
                  style={{ marginLeft: 12 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Línea de tiempo */}
      <div className="timeline-list">
        {loadingTimeline && <p>Cargando línea de tiempo...</p>}
        {errorTimeline && <p style={{ color: "#d72660" }}>{errorTimeline}</p>}
        {!loadingTimeline && timeline.length === 0 && (
          <p style={{ color: "#888" }}>
            No hay elementos en la línea de tiempo aún.
          </p>
        )}
        {timeline.map((item, idx) => (
          <div
            className="timeline-item timeline-item-large"
            key={item.id}
            style={{
              maxWidth: 600,
              width: "100%",
              margin: "32px auto",
              padding: 32,
              borderRadius: "1.5rem",
              background: "#f7fafd",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              display: "flex",
              alignItems: "center",
              gap: 32,
              cursor: "pointer",
              transition: "box-shadow 0.2s",
            }}
            onClick={() => {
              setViewItem(item);
              setShowViewModal(true);
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[item.coverIndex || 0]}
                  alt={item.title}
                  className="timeline-photo timeline-photo-large"
                  style={{
                    width: 140,
                    height: 140,
                    objectFit: "cover",
                    borderRadius: "1rem",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewItem(item);
                    setShowViewModal(true);
                  }}
                />
              ) : (
                <span style={{ color: "#888" }}>Sin imagen</span>
              )}
            </div>
            <div
              className="timeline-info"
              style={{ flex: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 24, color: "#d72660", marginBottom: 8 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 18, marginBottom: 8 }}>
                {item.description}
              </p>
              <p style={{ fontSize: 16, marginBottom: 4 }}>
                <b>Lugar:</b> {item.place}
              </p>
              <p style={{ fontSize: 16, marginBottom: 12 }}>
                <b>Fecha:</b> {item.date} <b>Hora:</b>{" "}
                {formatTime12h(item.time)}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn"
                  style={{ marginTop: 0, minWidth: 90 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(idx, item);
                  }}
                >
                  Editar
                </button>
                <button
                  className="btn"
                  style={{ marginTop: 0, background: "#d72660", minWidth: 90 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* Modal para ver foto y descripción en grande */}
        {showViewModal && viewItem && (
          <div
            className="modal-overlay"
            onClick={() => setShowViewModal(false)}
          >
            <div
              className="modal"
              style={{ maxWidth: 600, textAlign: "center", padding: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: 24,
                }}
              >
                {viewItem.images && viewItem.images.length > 0 ? (
                  viewItem.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={viewItem.title}
                      className="timeline-photo-large"
                      style={{
                        width: 180,
                        height: 180,
                        objectFit: "cover",
                        borderRadius: "1.2rem",
                        boxShadow: "0 4px 16px #d7266044",
                      }}
                    />
                  ))
                ) : (
                  <span style={{ color: "#888" }}>Sin imagen</span>
                )}
              </div>
              <h2 style={{ color: "#d72660", marginBottom: 12 }}>
                {viewItem.title}
              </h2>
              <p
                style={{
                  fontSize: 20,
                  marginBottom: 18,
                  color: "#d72660",
                  fontWeight: "bold",
                }}
              >
                {viewItem.description}
              </p>
              <p style={{ fontSize: 16, marginBottom: 4, color: "#333" }}>
                <b>Lugar:</b> {viewItem.place}
              </p>
              <p style={{ fontSize: 16, marginBottom: 12, color: "#333" }}>
                <b>Fecha:</b> {viewItem.date} <b>Hora:</b>{" "}
                {formatTime12h(viewItem.time)}
              </p>
              <button
                className="btn"
                onClick={() => setShowViewModal(false)}
                style={{ marginTop: 12 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div
              className="modal"
              style={{ maxWidth: 380, textAlign: "center", padding: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ color: "#d72660", marginBottom: 16 }}>
                ¿Eliminar nota?
              </h2>
              <p style={{ marginBottom: 24 }}>
                ¿Estás seguro de que deseas eliminar esta nota? Esta acción no
                se puede deshacer.
              </p>
              <button
                className="btn"
                style={{ background: "#d72660", minWidth: 90 }}
                onClick={confirmDelete}
              >
                Eliminar
              </button>
              <button
                className="btn"
                style={{ marginLeft: 12, minWidth: 90 }}
                onClick={cancelDelete}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Modal para editar */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Editar elemento</h2>
            <form onSubmit={handleEditSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Título"
                value={editForm.title}
                onChange={handleEditFormChange}
                required
              />
              <input
                type="text"
                name="description"
                placeholder="Descripción"
                value={editForm.description}
                onChange={handleEditFormChange}
                required
              />
              <div style={{ width: "100%" }}>
                <input
                  type="text"
                  name="place"
                  placeholder="Lugar (puedes escribir o seleccionar en el mapa)"
                  value={editForm.place}
                  onFocus={() => setShowEditMap(true)}
                  onChange={handleEditFormChange}
                  required
                  style={{
                    cursor: "pointer",
                    background: showEditMap ? "#f8f8f8" : "#fff",
                  }}
                />
                {showEditMap && (
                  <div style={{ margin: "1rem 0" }}>
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={
                          editSelected || editCurrentLocation || defaultCenter
                        }
                        zoom={editSelected || editCurrentLocation ? 16 : 5}
                        onClick={async (e) => {
                          const lat = e.latLng && e.latLng.lat();
                          const lng = e.latLng && e.latLng.lng();
                          if (lat && lng) {
                            setEditSelected({ lat, lng });
                            setEditAddressError("");
                            setLoadingEditAddress(true);
                            try {
                              await getEditAddressFromLatLng(lat, lng);
                              if (!editForm.place)
                                setEditAddressError(
                                  "No se pudo obtener la dirección."
                                );
                            } catch {
                              setEditAddressError(
                                "No se pudo obtener la dirección."
                              );
                            }
                            setLoadingEditAddress(false);
                          }
                        }}
                      >
                        {editSelected && <Marker position={editSelected} />}
                      </GoogleMap>
                    ) : (
                      <div>Cargando mapa...</div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Dirección seleccionada"
                        value={editForm.place}
                        name="place"
                        readOnly
                        style={{ width: "100%", marginBottom: 8 }}
                      />
                      {loadingEditAddress && <div>Obteniendo dirección...</div>}
                      {editAddressError && (
                        <div style={{ color: "#d72660", fontWeight: "bold" }}>
                          {editAddressError}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setShowEditMap(false);
                        }}
                        style={{ marginLeft: 0 }}
                      >
                        Usar este lugar
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          setShowEditMap(false);
                          setEditSelected(null);
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="date"
                name="date"
                value={editForm.date}
                onChange={handleEditFormChange}
                required
              />
              <input
                type="time"
                name="time"
                value={editForm.time}
                onChange={handleEditFormChange}
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
                multiple
              />
              {/* Previsualización de imágenes en edición */}
              {editForm.images && editForm.images.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    margin: "10px 0",
                  }}
                >
                  {editForm.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        src={img}
                        alt="preview"
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: 8,
                          border:
                            editForm.coverIndex === idx
                              ? "2px solid #d72660"
                              : "2px solid transparent",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setEditForm((f) => ({ ...f, coverIndex: idx }))
                        }
                        title={
                          editForm.coverIndex === idx
                            ? "Portada"
                            : "Hacer portada"
                        }
                      />
                      {editForm.coverIndex === idx && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: -18,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#d72660",
                            color: "#fff",
                            borderRadius: 6,
                            fontSize: 10,
                            padding: "2px 6px",
                          }}
                        >
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm((f) => {
                            let newImages = f.images.filter(
                              (_, i) => i !== idx
                            );
                            let newCover = f.coverIndex;
                            if (newImages.length === 0) newCover = 0;
                            else if (idx === f.coverIndex) newCover = 0;
                            else if (idx < f.coverIndex)
                              newCover = f.coverIndex - 1;
                            return {
                              ...f,
                              images: newImages,
                              coverIndex: newCover,
                            };
                          });
                        }}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          background: "#d72660",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                        title="Eliminar imagen"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <button className="btn" type="submit">
                  Guardar cambios
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditSelected(null);
                  }}
                  style={{ marginLeft: 12 }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
