import re
import os

def insert_google_button(filepath, btn_text):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    if 'signInWithGoogle' not in code:
        code = code.replace(
            "const { signIn, serverStatus } = useAuth();",
            "const { signIn, signInWithGoogle, serverStatus } = useAuth();"
        )
        code = code.replace(
            "const { signUp, serverStatus } = useAuth();",
            "const { signUp, signInWithGoogle, serverStatus } = useAuth();"
        )

        google_handler = '''
  const handleGoogleAuth = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    if (!result.success) {
      setError(result.error || 'Login Google gagal');
      setLoading(false);
    }
  };
'''
        # insert before handleSubmit
        code = re.sub(
            r'const handleSubmit = async',
            google_handler.strip() + '\n\n  const handleSubmit = async',
            code
        )

        # insert button below the main button
        btn_code = f'''
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">atau</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={{handleGoogleAuth}}
              disabled={{loading}}
              sx={{ mb: 2 }}
            >
              {btn_text}
            </Button>
'''
        
        # In LoginPage it ends with: {loading ? 'Memproses...' : 'Masuk'} \n </Button>
        # Let's find </Button> and insert after it, but only the first instance that follows type="submit"
        
        button_regex = re.compile(r'(<Button[^>]*type="submit"[^>]*>.*?</Button>)', re.DOTALL)
        code = button_regex.sub(r'\1' + btn_code, code)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"Updated {filepath}")


insert_google_button('src/app/components/auth/LoginPage.tsx', 'Masuk dengan Google')
insert_google_button('src/app/components/auth/SignupPage.tsx', 'Daftar dengan Google')
