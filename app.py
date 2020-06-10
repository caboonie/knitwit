from database import *
from flask import Flask, request, redirect, render_template
from flask import session as login_session
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'you-will-never-guess'


@app.route('/')
def home():
    if 'name' in login_session and login_session['name'] != None:
        user = get_user(login_session['name'])
        if user != None:
            return main()
    return render_template('home.html')
    

@app.route('/login', methods=['POST'])
def login():
    print("logging in")
    user = get_user(request.form['username'])
    print(user)
    if user != None and user.password == request.form["password"]:
        login_session['name'] = user.username
        return main()
    else:
        return home()


@app.route('/signup', methods=['POST'])
def signup():
    #check that username isn't taken
    user = get_user(request.form['username'])
    if user == None:
        create_user(request.form['username'],request.form['password'])
    return home()


@app.route('/main')
def main():
    if 'name' not in login_session or login_session['name'] == None:
        return home()
    user = get_user(login_session['name'])
    if user == None:
        return home()
    patterns = get_users_patterns(user.id)
    pattern = None
    if len(patterns) > 0:
        pattern = patterns[-1]
    print(type(pattern),"is type of pattern")
    return render_template("main.html", pattern=pattern.pattern_json)


@app.route('/logout')
def logout():
    login_session['name'] = None
    return home()

# todo - to handle multiple pattern saves, make pattern id part of the url and only save the latest patter
# make a screen for users to make new patterns
# save added-colors as well (tack on array as part of the json string?)
@app.route('/save', methods=['POST'])
def save():
    if 'name' not in login_session or login_session['name'] == None:
        return "not logged in"
    user = get_user(login_session['name'])
    if user == None:
        return "bad user"
    pattern = request.get_json()
    add_pattern(user, json.dumps(pattern))
    return "saved"


if __name__ == '__main__':
    app.run(debug=True)
