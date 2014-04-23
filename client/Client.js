var Client = function(n) {
	var name = n,
			id;

	var getName = function() {
		return name;
	}

	return {
		getName: getName,
		id: id
	}
};
