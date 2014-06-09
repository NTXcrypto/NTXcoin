javac -sourcepath src/java/ -classpath "conf/;classes/;./lib/*" -d classes/ src/java/nxt/crypto/*.java src/java/nxt/http/*.java src/java/nxt/peer/*.java src/java/nxt/user/*.java src/java/nxt/util/*.java src/java/nxt/*.java -Xlint:unchecked

jar cf nxt.jar -C classes .