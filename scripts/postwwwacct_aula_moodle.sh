#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ValidaNet — postwwwacct hook para auto-instalar Moodle 4.5 LTS en aulas
# ─────────────────────────────────────────────────────────────────────────────
# Este script vive públicamente en:
#   https://raw.githubusercontent.com/arojasc2/validanet-web/master/scripts/postwwwacct_aula_moodle.sh
# y también en:
#   https://validanet.cl/scripts/postwwwacct_aula_moodle.sh
#
# Instalación one-time en el WHM box (requiere SSH o WHM Terminal):
#
#   curl -fsSL https://validanet.cl/scripts/postwwwacct_aula_moodle.sh \
#     -o /usr/local/cpanel/scripts/postwwwacct
#   chmod +x /usr/local/cpanel/scripts/postwwwacct
#
# Y configurar las dos variables de entorno (en /etc/environment o /root/.bashrc):
#   export AULA_HOOK_TOKEN="<copiar valor de /opt/tutorai/.env de VPS1>"
#   export VALIDANET_CALLBACK_URL="https://app.validanet.cl/webhooks/aulas/hook-completed"
#
# Docs cPanel: https://docs.cpanel.net/whm/scripts/the-postwwwacct-script/
# El script recibe ENV vars: $user, $domain, $plan, $contactemail
#
# Solo procesa cuentas con plan que matchee root_aula_*. Las 9 cuentas
# pre-ValidaNet (gremm2025, academia, vidasa2024, etc) se ignoran.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Log unificado
LOGFILE="/var/log/validanet_aulas.log"
exec >>"$LOGFILE" 2>&1

# ─── 1) Cargar config desde /etc/validanet_aulas.conf si existe ───
# cPanel hooks corren con env minimal (no carga /etc/environment ni .bashrc).
# Por eso AULA_HOOK_TOKEN y VALIDANET_CALLBACK_URL se cargan de un config
# explícito que admin escribe una vez:
#   /etc/validanet_aulas.conf con líneas KEY=value
if [ -r /etc/validanet_aulas.conf ]; then
  set -a
  . /etc/validanet_aulas.conf
  set +a
fi
# Fallback secundario: /etc/environment (algunas configs de cPanel sí lo cargan)
if [ -z "$AULA_HOOK_TOKEN" ] && [ -r /etc/environment ]; then
  set -a
  . /etc/environment
  set +a
fi

: "${AULA_HOOK_TOKEN:=}"
: "${VALIDANET_CALLBACK_URL:=https://app.validanet.cl/webhooks/aulas/hook-completed}"

# ─── 2) Parsear argumentos cPanel ───
# cPanel postwwwacct (WHM 11.x) llama el hook con pares nombre-valor:
#   /usr/local/cpanel/scripts/postwwwacct owner root user X domain Y plan Z password P ...
# NO con posicional puro. Convertimos $@ en hash.
declare -A ARGS
while [ "$#" -gt 1 ]; do
  ARGS["$1"]="$2"
  shift 2
done

user="${ARGS[user]:-${user:-}}"
domain="${ARGS[domain]:-${domain:-}}"
plan="${ARGS[plan]:-${plan:-}}"
contactemail="${ARGS[contactemail]:-${ARGS[email]:-${contactemail:-}}}"
owner="${ARGS[owner]:-}"

echo "=== $(date -Iseconds) postwwwacct user=$user domain=$domain plan=$plan owner=$owner ==="
echo "    AULA_HOOK_TOKEN: $([ -n "$AULA_HOOK_TOKEN" ] && echo 'set ('${#AULA_HOOK_TOKEN}' chars)' || echo 'EMPTY')"
echo "    CALLBACK_URL:    $VALIDANET_CALLBACK_URL"
echo "    Args recibidos:  ${!ARGS[*]}"

if [ -z "$AULA_HOOK_TOKEN" ]; then
  echo "[!] AULA_HOOK_TOKEN no configurado — admin debe crear /etc/validanet_aulas.conf"
fi

# ─── Filtro: solo planes aula_* ───
case "$plan" in
  root_aula_starter|root_aula_pro|root_aula_business|aula_starter|aula_pro|aula_business)
    echo "[+] Plan aula detectado: $plan — procediendo con install Moodle 4.5 LTS"
    ;;
  *)
    echo "[-] Plan '$plan' no es de aula — skip (no afecta cuentas pre-existentes)"
    exit 0
    ;;
esac

if [ -z "$user" ] || [ -z "$domain" ]; then
  echo "[!] user o domain vacíos — abort"
  exit 1
fi

HOME_DIR="/home/$user"
# PHP 8.3 EA (Moodle 4.5 requiere PHP 8.1-8.3, NO 8.4).
# /usr/local/cpanel/3rdparty/bin/php es PHP 8.4 default del cPanel y NO sirve.
PHP="/opt/cpanel/ea-php83/root/usr/bin/php"
if [ ! -x "$PHP" ]; then
  echo "[!] $PHP no existe — instalar con: yum install ea-php83 ea-php83-php-sodium ea-php83-php-mysqlnd ea-php83-php-gd ea-php83-php-intl ea-php83-php-mbstring ea-php83-php-xml ea-php83-php-zip ea-php83-php-soap ea-php83-php-curl"
  exit 3
fi
# Moodle 4.5 LTS — release oct/2024, soporte hasta dic/2027
MOODLE_URL="https://download.moodle.org/download.php/direct/stable405/moodle-latest-405.tgz"
TGZ="/tmp/moodle-${user}-$(date +%s).tgz"

# ─── 1) Descargar Moodle 4.5 LTS ───
echo "[1/9] Descargando Moodle 4.5 LTS desde $MOODLE_URL..."
wget -q --tries=3 --timeout=60 "$MOODLE_URL" -O "$TGZ"
if [ ! -s "$TGZ" ]; then
  echo "[!] Descarga Moodle falló — tarball vacío"
  exit 2
fi

# ─── 2) Extraer en public_html ───
echo "[2/9] Extrayendo a $HOME_DIR/public_html..."
rm -rf "$HOME_DIR/public_html/cgi-bin" 2>/dev/null || true
tar -xzf "$TGZ" -C "$HOME_DIR/public_html/" --strip-components=1
rm -f "$TGZ"

# ─── 3) moodledata fuera de public_html ───
echo "[3/9] Creando moodledata..."
mkdir -p "$HOME_DIR/moodledata"

# ─── 4) Permisos ───
echo "[4/9] Ajustando permisos..."
chown -R "$user:nobody" "$HOME_DIR/public_html"
chown -R "$user:nobody" "$HOME_DIR/moodledata"
chmod 770 "$HOME_DIR/moodledata"
chmod -R 755 "$HOME_DIR/public_html"

# ─── 5) Crear BD via UAPI ───
echo "[5/9] Creando BD via UAPI..."
DBNAME="${user}_mdl"
DBUSER="${user}_mdl"
DBPASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
uapi --user="$user" Mysql create_database name="$DBNAME" >/dev/null 2>&1 || echo "  (db quizá ya existía)"
uapi --user="$user" Mysql create_user name="$DBUSER" password="$DBPASS" >/dev/null 2>&1 || echo "  (user quizá ya existía)"
uapi --user="$user" Mysql set_privileges_on_database \
  user="$DBUSER" database="$DBNAME" privileges="ALL PRIVILEGES" >/dev/null 2>&1

# ─── 6) Install Moodle CLI ───
echo "[6/9] Instalando Moodle CLI..."
ADMIN_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
SHORTNAME=$(echo "$user" | tr -cd 'a-z0-9' | head -c 20)

# install.php hace todo (DB schema + admin user + config). dbtype=mysqli en
# lugar de mariadb evita que Moodle aplique checks de MariaDB legacy que
# fallan contra MySQL 8.x (que cPanel reporta como "mariadb 8.x").
# -d flags: max_input_vars=5000 (Moodle requirement) + memory_limit=512M
sudo -u "$user" "$PHP" \
  -d max_input_vars=5000 \
  -d memory_limit=512M \
  -d max_execution_time=300 \
  "$HOME_DIR/public_html/admin/cli/install.php" \
  --non-interactive --lang=es \
  --wwwroot="https://$domain" \
  --dataroot="$HOME_DIR/moodledata" \
  --dbtype=mysqli --dbhost=localhost \
  --dbname="$DBNAME" --dbuser="$DBUSER" --dbpass="$DBPASS" \
  --fullname="Aula Virtual" --shortname="$SHORTNAME" \
  --adminuser=admin --adminpass="$ADMIN_PASS" \
  --adminemail="$contactemail" --agree-license

# ─── 7) Habilitar plugins desde UI (admin completo en todos los planes) ───
echo "[7/9] Habilitando instalación de plugins desde UI..."
sudo -u "$user" "$PHP" "$HOME_DIR/public_html/admin/cli/cfg.php" --name=disableupdateautodeploy --set=0 || true
sudo -u "$user" "$PHP" "$HOME_DIR/public_html/admin/cli/cfg.php" --name=updateautocheck --set=1 || true
sudo -u "$user" "$PHP" "$HOME_DIR/public_html/admin/cli/cfg.php" --name=enableupdatenotifications --set=1 || true

# ─── 8) Marcar instalación OK ───
echo "[8/9] Moodle 4.5 LTS instalado OK para $user @ $domain"

# ─── 9) Callback HTTP a ValidaNet ───
echo "[9/9] POST callback a $VALIDANET_CALLBACK_URL..."
CALLBACK_PAYLOAD=$(cat <<JSON
{
  "cpanel_user": "$user",
  "domain": "$domain",
  "plan": "$plan",
  "admin_user": "admin",
  "admin_password": "$ADMIN_PASS",
  "db_name": "$DBNAME",
  "db_user": "$DBUSER",
  "moodle_version": "4.5",
  "hook_token": "$AULA_HOOK_TOKEN"
}
JSON
)

HTTP_CODE=$(curl -s -m 15 -X POST "$VALIDANET_CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -d "$CALLBACK_PAYLOAD" \
  -o /tmp/validanet_callback_${user}.log \
  -w "%{http_code}" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "    ✓ Callback OK (HTTP $HTTP_CODE)"
else
  echo "    ⚠ Callback respondió HTTP $HTTP_CODE — admin puede marcar manualmente"
  echo "      Body: $(cat /tmp/validanet_callback_${user}.log 2>/dev/null | head -c 200)"
fi

echo "=== $(date -Iseconds) postwwwacct DONE — $user ==="
exit 0
