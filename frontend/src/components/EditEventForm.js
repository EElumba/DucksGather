import React, { useEffect, useState } from 'react';
import '../styles/CreateEvent.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getEvent, updateEvent, searchBuildings, deleteEvent } from '../api/client';
import DeleteEvent from './delete';

// We reuse the same category options and styling as the create-event flow
const CATEGORY_OPTIONS = [
  'Accounting',
  'Anthropology',
  'Architecture',
  'Art',
  'Art and Technology',
  'Art History',
  'Asian Studies',
  'Biochemistry',
  'Biology',
  'Business Administration',
  'Chemistry',
  'Child Behavioral Health',
  'Chinese',
  'Cinema Studies',
  'Classics',
  'Communication Disorders & Sciences',
  'Comparative Literature',
  'Computer Science',
  'Cybersecurity',
  'Dance',
  'Data Science',
  'Earth Sciences',
  'Economics',
  'Educational Foundations',
  'English',
  'Environmental Design',
  'Environmental Science',
  'Environmental Studies',
  'Ethnic Studies',
  'Family & Human Services',
  'Folklore & Public Culture',
  'French & Francophone Studies',
  'General Social Science',
  'Geography',
  'German',
  'Global Studies',
  'History',
  'Human Physiology',
  'Humanities',
  'Interior Architecture',
  'Italian Studies',
  'Journalism',
  'Journalism: Advertising',
  'Journalism: Media Studies',
  'Journalism: Public Relations',
  'Judaic Studies',
  'Japanese',
  'Landscape Architecture',
  'Latin American Studies',
  'Linguistics',
  'Mathematics',
  'Mathematics & Computer Science',
  'Marine Biology',
  'Materials Science & Technology',
  'Medieval Studies',
  'Multidisciplinary Science',
  'Music',
  'Music Composition',
  'Music Education',
  'Music: Jazz Studies',
  'Music Performance',
  'Native American & Indigenous Studies',
  'Neuroscience',
  'Philosophy',
  'Physics',
  'Planning, Public Policy & Management',
  'Political Science',
  'Popular Music',
  'Product Design',
  'Psychology',
  'Religious Studies',
  'Romance Languages',
  'Russian, East European & Eurasian Studies',
  'Sociology',
  'Spatial Data Science & Technology',
  'Spanish',
  'Theater Arts',
  'Women, Gender & Sexuality Studies',
];

export default function EditEventForm() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  // Local form state mirrors CreateEventForm but is initialized from the existing event
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [buildingSuggestions, setBuildingSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Only admins, coordinators, and the event creator should be able to edit.
  // We mirror the backend authorization (creator or admin) and also allow
  // coordinators here if needed by the product.

  // First, fetch the existing event so we can both pre-fill the form and
  // verify that the current user is allowed to edit.
  useEffect(() => {
    async function fetchAndAuthorize() {
      try {
        setLoading(true);
        setError(null);
        const ev = await getEvent(id);

        // Basic ownership / role-based authorization check on the client.
        const createdBy = ev.created_by;
        const isOwner = createdBy && user && String(createdBy) === String(user.id);
        const isAdmin = role === 'admin';

        if (!isOwner && !isAdmin && role !== 'coordinator') {
          setError('You are not allowed to edit this event.');
          setLoading(false);
          return;
        }

        // Pre-fill all fields from the existing event data.
        setTitle(ev.title || '');
        setCategory(ev.category || '');
        setDate(ev.date || '');
        setStartTime(ev.start_time || '');
        setEndTime(ev.end_time || '');
        setDescription(ev.description || '');
        setOrganizationName(ev.organization_name || '');

        // Derive building / room from the event's location, if present.
        // This mirrors how EventDetail formats location for display.
        if (typeof ev.location === 'string') {
          setBuildingName(ev.location);
        } else if (ev.location && typeof ev.location === 'object') {
          const { building_name, room_number } = ev.location;
          if (building_name) {
            setBuildingName(building_name);
          }
          if (room_number) {
            setRoomNumber(room_number);
          }
        }
      } catch (e) {
        setError(e.message || 'Failed to load event for editing.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchAndAuthorize();
    }
  }, [id, role, user]);

  const filteredCategories = CATEGORY_OPTIONS.filter(opt =>
    opt.toLowerCase().includes(categorySearch.toLowerCase())
  );

  async function handleBuildingChange(e) {
    const value = e.target.value;
    setBuildingName(value);

    const trimmed = value.trim();
    if (!trimmed) {
      setBuildingSuggestions([]);
      return;
    }

    try {
      const results = await searchBuildings(trimmed);
      setBuildingSuggestions(results || []);
    } catch (err) {
      // optional: ignore or log
      setBuildingSuggestions([]);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (!buildingName.trim()) {
      setError('Building name is required.');
      setSubmitting(false);
      return;
    }

    try {
      // Build a partial update payload matching the backend's update_event route.
      const patch = {
        title,
        category,
        date,
        start_time: startTime,
        end_time: endTime,
        description,
        organization_name: organizationName || null,
        building_name: buildingName || null,
        room_number: roomNumber || null,
      };

      const updated = await updateEvent(id, patch);

      // After a successful update, send the user back to the event detail view
      // for this event.
      if (updated && updated.event_id) {
        navigate(`/events/${updated.event_id}`);
      } else {
        navigate(`/events/${id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting the event entirely. This calls the backend DELETE
  // /api/events/<id> route (via the deleteEvent helper), shows a simple
  // confirmation, and then returns the user to the Explore page.
  const handleDelete = async () => {
    // Basic guard to prevent duplicate clicks while a delete is already
    // in progress, or if we somehow don't have an event id.
    if (deleting || !id) return;

    // Optional: ask the user to confirm before performing a destructive action.
    const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      await deleteEvent(id);

      // After a successful delete, provide a lightweight confirmation and
      // send the user back to the main Explore events view.
      window.alert('Event deleted successfully.');
      navigate('/explore');
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-event-page-root">
        <div className="create-event-card">
          <p>Loading event for editing…</p>
        </div>
      </div>
    );
  }

  if (error && !submitting && !title && !date) {
    // If we hit an authorization or load error before we could populate the
    // form, show a simple message instead of the editor.
    return (
      <div className="create-event-page-root">
        <div className="create-event-card">
          <p className="create-event-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page-root">
      <div className="create-event-card">
        <div className="create-event-logo-circle">📅</div>

        {/* Heading is the only visual change from CreateEventForm */}
        <h1 className="create-event-title">Edit Event</h1>
        <p className="create-event-subtitle">
          Update the details for this DucksGather event.
        </p>

        {error && <div className="create-event-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-event-form">
          {/* Title */}
          <div className="create-event-field">
            <label className="create-event-label">Title</label>
            <input
              className="create-event-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Game night at the EMU"
            />
          </div>

          {/* Category searchable dropdown */}
          <div className="create-event-field">
            <label className="create-event-label">Category</label>
            <select
              className="create-event-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>
              {filteredCategories.map(opt => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date + times */}
          <div className="create-event-row">
            <div className="create-event-field">
              <label className="create-event-label">Date</label>
              <input
                className="create-event-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div className="create-event-field">
              <label className="create-event-label">Start time</label>
              <input
                className="create-event-input"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="create-event-field">
              <label className="create-event-label">End time</label>
              <input
                className="create-event-input"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="create-event-field">
            <label className="create-event-label">Description</label>
            <textarea
              className="create-event-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder="What is this event about?"
            />
          </div>

          {/* Optional organization */}
          <div className="create-event-field">
            <label className="create-event-label">
              Organization (optional)
            </label>
            <input
              className="create-event-input"
              type="text"
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              placeholder="e.g. UO Esports, ACM, Women in CS"
            />
          </div>

          {/* Location (building + room) */}
          <div className="create-event-field">
            <label className="create-event-label">Building</label>
            <input
              className="create-event-input"
              type="text"
              value={buildingName}
              onChange={handleBuildingChange}
              placeholder="e.g. EMU, Lillis, Knight Library"
            />

            {buildingSuggestions.length > 0 && (
              <ul className="create-event-suggestions">
                {buildingSuggestions.map(name => (
                  <li
                    key={name}
                    onClick={() => {
                      setBuildingName(name);
                      setBuildingSuggestions([]);
                    }}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="create-event-field">
            <label className="create-event-label">Room number</label>
            <input
              className="create-event-input"
              type="text"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              placeholder="e.g. 123, 2F, Auditorium"
            />
          </div>

          {/* Reusable delete control: this embeds the DeleteEvent component, which
              shows a confirmation modal before calling the DELETE /api/events
              endpoint. We pass the current event id and navigate back to
              Explore once deletion succeeds. */}
          <DeleteEvent
            eventId={id}
            onDelete={() => navigate('/explore')}
          />

          {/* Destructive delete action: styled similarly to the primary submit
              button but with a red variant, and placed directly above the
              Save Changes button. */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="create-event-submit create-event-submit-danger"
          >
            {deleting ? 'Deleting…' : 'Delete Event'}
          </button>

          <button
            type="submit"
            disabled={submitting || !title || !category || !date || !startTime || !endTime}
            className="create-event-submit"
          >
            {submitting ? 'Saving changes…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
