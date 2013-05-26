import web
import os, sys

urls = (
        '/(.*)', 'hello'
        )

app = web.application(urls, globals())

class hello:
    def GET(self, name):
        if not name:
            name = 'World'
        return 'Hello, ' + name + '!'

if __name__ == '__main__':
    port = os.environ.get('PORT', '5000')
    sys.argv[1] = port
    app.run()
