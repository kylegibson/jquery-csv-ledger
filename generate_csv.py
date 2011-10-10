import sys
import csv
import datetime
import random

def main(args):
	rows = []
	w = csv.writer(sys.stdout, quoting=csv.QUOTE_ALL)
	w.writerows(rows)

if __name__ == '__main__':
	main(sys.argv)
