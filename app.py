from database import *
from flask import Flask, request, redirect, render_template
from flask import session as login_session
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'you-will-never-guess'

DEFAULT_PATTERN_JSON = json.dumps({'grid': [[{'color': 'rgb(232, 232, 232)', 'x': 0, 'y': 0}]], 'height': 1, 'width': 1})

def check_login(fail_fn = lambda: home):
    def _decorator_check_login(function):
        def _wrapper(*args, **kwargs):
            if 'user' not in login_session or login_session['user'] == None:
                return fail_fn()
            if get_user(login_session['user']) == None:
                return fail_fn()
            return function(*args, **kwargs)
        return _wrapper
    return _decorator_check_login

@app.route('/')
def home():
    if 'user' in login_session and login_session['user'] != None:
        if get_user(login_session['user']) != None:
            return main_page()
    return render_template('home.html')
    

@app.route('/login', methods=['POST'])
def login():
    print("logging in")
    user = get_user(request.form['username'])
    print(user)
    if user != None and user.password == request.form["password"]:
        login_session['user'] = user.username
        return main_page()
    else:
        return home()


@app.route('/signup', methods=['POST'])
def signup():
    #check that username isn't taken
    user = get_user(request.form['username'])
    if user == None:
        user = create_user(request.form['username'],request.form['password'])
        login_session['user'] = user.username
        return main_page()
    return home()

@check_login()
@app.route('/main_page')
def main_page():
    patterns = get_users_patterns(get_user(login_session['user']))
    return render_template("main.html", patterns=patterns)

@check_login()
@app.route('/new_pattern', methods=['POST'])
def new_pattern():
    pattern = add_pattern(get_user(login_session['user']), request.form['name'], DEFAULT_PATTERN_JSON)
    return pattern_page(pattern.id)

@check_login()
@app.route('/pattern<pattern_id>')
def pattern_page(pattern_id):
    pattern = get_pattern(pattern_id)
    if pattern == None:
        return "404 not valid pattern id"
    return render_template("pattern.html", pattern=pattern.pattern_json, pattern_id=pattern.id)


@app.route('/logout')
def logout():
    login_session['user'] = None
    return home()


# make a screen for users to make new patterns - specify the dims
# save added-colors as well (tack on array as part of the json string?)
@check_login(lambda: "not logged in")
@app.route('/save', methods=['POST'])
def save():
    pattern = request.get_json()
    print("pattern",pattern)
    update_pattern(pattern['id'], json.dumps(pattern))
    return "saved"


if __name__ == '__main__':
    app.run(debug=True)
