#!/bin/bash

NAME='webhook'
TARGET='hooked@test-management'
DEST='/var/www'

tar -zcvf $NAME.tar.gz deploy.mjs index.mjs package.json log.mjs views
scp $NAME.tar.gz $TARGET:$DEST
echo "
  pm2 delete $NAME;
  rm -rf $DEST/$NAME;
  mkdir $DEST/$NAME;
  tar -xvf $DEST/$NAME.tar.gz -C $DEST/$NAME;
  rm -rf $DEST/$NAME.tar.gz;
  cd $DEST/$NAME;
  mkdir logs;
  npm install;
  pm2 start $DEST/$NAME/index.mjs --name webhook -i 2 --node-args=\"--experimental-modules\"
" | ssh $TARGET /bin/bash
rm -rf $NAME.tar.gz