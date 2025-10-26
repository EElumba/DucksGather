"""
DucksGather SQLAlchemy Models
Defines ORM models for all database tables.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Date, Time, Boolean, 
    TIMESTAMP, ForeignKey, CheckConstraint, UniqueConstraint,
    DECIMAL, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from backend.src.db.db_init import Base


class Organization(Base):
    """Model for organizations table."""
    __tablename__ = 'organizations'
    
    organization_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    contact_email = Column(String(255))
    website_url = Column(String(500))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    events = relationship("Event", back_populates="organization")
    images = relationship("Image", back_populates="organization")
    
    def __repr__(self):
        return f"<Organization(id={self.organization_id}, name='{self.name}')>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'contact_email': self.contact_email,
            'website_url': self.website_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Location(Base):
    """Model for locations table."""
    __tablename__ = 'locations'
    __table_args__ = (
        UniqueConstraint('building_name', 'room_number', name='uq_building_room'),
    )
    
    location_id = Column(Integer, primary_key=True, autoincrement=True)
    building_name = Column(String(255), nullable=False)
    room_number = Column(String(50))
    address = Column(String(500))
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    events = relationship("Event", back_populates="location")
    
    def __repr__(self):
        return f"<Location(id={self.location_id}, building='{self.building_name}', room='{self.room_number}')>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'location_id': self.location_id,
            'building_name': self.building_name,
            'room_number': self.room_number,
            'address': self.address,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class User(Base):
    """Model for users table."""
    __tablename__ = 'users'
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(255))
    role = Column(String(50), default='user')
    major = Column(String(255))
    preferences = Column(JSONB)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("role IN ('user', 'coordinator', 'admin')", name='check_user_role'),
    )
    
    # Relationships
    created_events = relationship("Event", back_populates="creator")
    saved_events = relationship("UserEvent", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.user_id}, email='{self.email}', role='{self.role}')>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'user_id': str(self.user_id),
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'major': self.major,
            'preferences': self.preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Event(Base):
    """Model for events table."""
    __tablename__ = 'events'
    
    event_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    image_url = Column(String(500))
    external_url = Column(String(500))
    organization_id = Column(Integer, ForeignKey('organizations.organization_id', ondelete='SET NULL'))
    location_id = Column(Integer, ForeignKey('locations.location_id', ondelete='SET NULL'))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='SET NULL'))
    is_scraped = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('end_time > start_time', name='check_valid_time_range'),
        CheckConstraint('date >= CURRENT_DATE', name='check_valid_date'),
    )
    
    # Relationships
    organization = relationship("Organization", back_populates="events")
    location = relationship("Location", back_populates="events")
    creator = relationship("User", back_populates="created_events")
    images = relationship("Image", back_populates="event")
    user_events = relationship("UserEvent", back_populates="event")
    
    def __repr__(self):
        return f"<Event(id={self.event_id}, title='{self.title}', date={self.date})>"
    
    def to_dict(self):
        """Convert model to dictionary with related data."""
        return {
            'event_id': self.event_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'image_url': self.image_url,
            'external_url': self.external_url,
            'organization_id': self.organization_id,
            'organization': self.organization.to_dict() if self.organization else None,
            'location_id': self.location_id,
            'location': self.location.to_dict() if self.location else None,
            'created_by': str(self.created_by) if self.created_by else None,
            'is_scraped': self.is_scraped,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Image(Base):
    """Model for images table."""
    __tablename__ = 'images'
    
    image_id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey('events.event_id', ondelete='CASCADE'))
    organization_id = Column(Integer, ForeignKey('organizations.organization_id', ondelete='CASCADE'))
    image_url = Column(String(500), nullable=False)
    upload_date = Column(TIMESTAMP, default=datetime.utcnow)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    
    __table_args__ = (
        CheckConstraint(
            '(event_id IS NOT NULL AND organization_id IS NULL) OR '
            '(event_id IS NULL AND organization_id IS NOT NULL)',
            name='check_event_or_org'
        ),
    )
    
    # Relationships
    event = relationship("Event", back_populates="images")
    organization = relationship("Organization", back_populates="images")
    
    def __repr__(self):
        return f"<Image(id={self.image_id}, event_id={self.event_id}, org_id={self.organization_id})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'image_id': self.image_id,
            'event_id': self.event_id,
            'organization_id': self.organization_id,
            'image_url': self.image_url,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'file_size': self.file_size,
            'mime_type': self.mime_type
        }


class UserEvent(Base):
    """Model for user_events junction table."""
    __tablename__ = 'user_events'
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    event_id = Column(Integer, ForeignKey('events.event_id', ondelete='CASCADE'), primary_key=True)
    saved_at = Column(TIMESTAMP, default=datetime.utcnow)
    reminder_sent = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="saved_events")
    event = relationship("Event", back_populates="user_events")
    
    def __repr__(self):
        return f"<UserEvent(user_id={self.user_id}, event_id={self.event_id})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'user_id': str(self.user_id),
            'event_id': self.event_id,
            'saved_at': self.saved_at.isoformat() if self.saved_at else None,
            'reminder_sent': self.reminder_sent
        }
