import React, { useState } from 'react';
import '../styles/CreateEvent.css';
import { useAuth } from '../context/AuthContext';
import { createEvent } from '../api/client'; // or whatever you named it


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


export default function CreateEventForm() {
  const { role } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  if (role !== 'admin' && role !== 'coordinator') {
    return <p>You must be a coordinator or admin to create events.</p>;
  }

  const filteredCategories = CATEGORY_OPTIONS.filter(opt =>
    opt.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Shape that matches Event.to_dict + optional organization
      const payload = {
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

      await createEvent(payload); // implement in your API client

      // Clear or redirect after success
      setTitle('');
      setCategory('');
      setCategorySearch('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setDescription('');
      setOrganizationName('');
      setBuildingName('');
      setRoomNumber('');
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-event-page-root">
      <div className="create-event-card">
        <div className="create-event-logo-circle">📅</div>

        <h1 className="create-event-title">Create Event</h1>
        <p className="create-event-subtitle">
          Share your UOregon event with the DucksGather community.
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
            <input
              className="create-event-input"
              type="text"
              placeholder="Search categories…"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
            />
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
          <div className="create-event-row">
            <div className="create-event-field">
              <label className="create-event-label">Building name</label>
              <input
                className="create-event-input"
                type="text"
                value={buildingName}
                onChange={e => setBuildingName(e.target.value)}
                placeholder="e.g. EMU, Lillis, Knight Library"
              />
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
          </div>

          <button
            type="submit"
            disabled={submitting || !title || !category || !date || !startTime || !endTime}
            className="create-event-submit"
          >
            {submitting ? 'Creating event…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}