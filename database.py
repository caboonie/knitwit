from models import *
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///users.db?check_same_thread=False')
Base.metadata.create_all(engine)
DBSession = sessionmaker(bind=engine)
session = DBSession()

def create_user(name,secret_word):
    user = User(username=name, password = secret_word)
    session.add(user)
    session.commit()
    return user

def get_user(username):
    return session.query(User).filter_by(username=username).first()

def get_user_id(id_num):
    return session.query(User).filter_by(id=id_num).first()

def add_pattern(user, name, pattern_json):
    pattern = Pattern(user_id = user.id, name=name, pattern_json = pattern_json)
    session.add(pattern)
    session.commit()
    return pattern

def get_pattern(id_num):
    return session.query(Pattern).filter_by(id=id_num).first()

def get_users_patterns(user):
    return session.query(Pattern).filter_by(user_id=user.id).all()

def get_pattern_user_name(user, name):
    return session.query(Pattern).filter_by(user_id=user.id).filter_by(name=name).first()

def update_pattern(id_num, pattern_json):
    pattern = session.query(Pattern).filter_by(id=id_num).first()
    pattern.pattern_json = pattern_json
    session.add(pattern)
    session.commit()
