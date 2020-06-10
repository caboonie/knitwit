from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from flask_login import UserMixin

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    password = Column(String)
    username = Column(String)

class Pattern(Base):
    __tablename__ = "patterns"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    pattern_json = Column(String)
