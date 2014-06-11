CP=conf/:classes/:lib/*
SP=src/java/

/bin/mkdir -p classes/

javac -sourcepath $SP -classpath $CP -d classes/ src/java/nxt/*.java src/java/nxt/*/*.java || exit 1

/bin/rm -f ntx.jar 
jar cf ntx.jar -C classes . || exit 1
/bin/rm -rf classes

echo "ntx.jar generated successfully"
